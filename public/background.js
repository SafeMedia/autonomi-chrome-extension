const SAFE_PATH_REGEX = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;

function isValidSafePath(input) {
    return SAFE_PATH_REGEX.test(input) && !input.includes("..");
}

const pendingUploads = new Map();
const pendingDownloads = new Map();
const pendingChunks = [];

let socket = null;
let socketReady = false;
let currentConnectionType = null;
let retryDelay = 2000;
let connecting = false;

function handleUploadChunk(request, senderId, sendResponse) {
    const { name, chunkIndex, totalChunks, data, mime_type, upload_id } =
        request.fileChunk;

    const uploadId =
        upload_id ||
        `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    console.log(
        `📦 Handling chunk ${
            chunkIndex + 1
        }/${totalChunks} — Upload ID: ${uploadId}`
    );

    // Only register callback and timeout for the first chunk
    if (chunkIndex === 0) {
        pendingUploads.set(uploadId, sendResponse);

        setTimeout(() => {
            if (pendingUploads.has(uploadId)) {
                const cb = pendingUploads.get(uploadId);
                console.error(`[❌ Upload Timeout] uploadId=${uploadId}`);
                cb({
                    success: false,
                    error: "Upload timed out after 3 minutes.",
                });
                pendingUploads.delete(uploadId);
            }
        }, 180000); // 3 minutes
    } else {
        // For all other chunks, respond immediately
        sendResponse({ success: true });
    }

    const chunkMessage = {
        type: "upload_chunk",
        metadata: {
            filename: name,
            mime_type,
            chunk_index: chunkIndex,
            total_chunks: totalChunks,
            upload_id: uploadId,
        },
        data,
    };

    if (!socketReady || socket.readyState !== WebSocket.OPEN) {
        console.log("⏳ Socket not ready — queuing chunk");
        pendingChunks.push(chunkMessage);
        ensureSocketConnected();
        return true;
    }

    socket.send(JSON.stringify(chunkMessage));
    console.log("✅ Chunk sent via WebSocket");

    return true; // async response
}

function flushPendingChunks() {
    if (!socketReady || socket.readyState !== WebSocket.OPEN) return;

    console.log(`🚀 Flushing ${pendingChunks.length} queued chunks`);
    while (pendingChunks.length > 0) {
        const chunk = pendingChunks.shift();
        socket.send(JSON.stringify(chunk));
    }
}

function ensureSocketConnected() {
    chrome.storage.local.get(["connectionType"], (res) => {
        const selected = res.connectionType || "local";
        if (
            !socket ||
            socket.readyState > 1 ||
            currentConnectionType !== selected
        ) {
            initWebSocket();
        }
    });
}

function displayUploadError(message) {
    const errorContainer = document.getElementById("upload-error-container");
    if (errorContainer) {
        const errorElem = document.createElement("div");
        errorElem.textContent = `❌ ${message}`;
        errorElem.style.color = "red";
        errorContainer.appendChild(errorElem);
    } else {
        console.error("Upload error:", message);
    }
}

async function findFirstWorkingWebSocket(urls) {
    const tryConnect = (url) =>
        new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error("Timeout"));
            }, 4000);
            ws.onopen = () => {
                clearTimeout(timeout);
                ws.close();
                resolve(url);
            };
            ws.onerror = ws.onclose = () => {
                clearTimeout(timeout);
                reject(new Error(`Failed to connect: ${url}`));
            };
        });

    try {
        return await Promise.any(urls.map(tryConnect));
    } catch {
        return null;
    }
}

function initWebSocket() {
    if (connecting) return;
    connecting = true;

    chrome.storage.local.get(
        ["connectionType", "endpointUrls", "localClientPort"],
        async (res) => {
            const selected = res.connectionType || "local";
            if (selected === currentConnectionType && socket?.readyState <= 1) {
                connecting = false;
                return;
            }

            if (socket?.readyState <= 1) socket.close();

            let wsUrl = null;
            if (selected === "endpoints") {
                const urls = (
                    res.endpointUrls || ["antsnest.site", "safemedia.com"]
                ).flatMap((domain) => [`wss://ws.${domain}`]);
                wsUrl = await findFirstWorkingWebSocket(urls);
                if (!wsUrl) {
                    notifyUser(
                        "Endpoint Error",
                        "❌ No working endpoint found."
                    );
                    connecting = false;
                    return;
                }
            } else {
                const port = res.localClientPort || 8084;
                wsUrl = `ws://localhost:${port}/upload-ws`;
            }

            currentConnectionType = selected;
            socket = new WebSocket(wsUrl);
            socket.binaryType = "arraybuffer";

            socket.onopen = () => {
                socketReady = true;
                retryDelay = 2000;
                connecting = false;
                flushPendingChunks();

                for (const [xorname] of pendingDownloads) {
                    socket.send(
                        JSON.stringify({ type: "download", address: xorname })
                    );
                }
            };

            socket.onmessage = async (event) => {
                if (typeof event.data === "string") {
                    try {
                        const parsed = JSON.parse(event.data);

                        if (
                            parsed.type === "upload_complete" &&
                            parsed.upload_id &&
                            parsed.xorname
                        ) {
                            const cb = pendingUploads.get(parsed.upload_id);
                            if (cb) {
                                cb({ success: true, xorname: parsed.xorname });
                                pendingUploads.delete(parsed.upload_id);
                            }

                            chrome.runtime.sendMessage({
                                action: "uploadComplete",
                                upload_id: parsed.upload_id,
                                xorname: parsed.xorname,
                            });
                        } else if (
                            parsed.type === "upload_error" &&
                            parsed.message
                        ) {
                            displayUploadError(parsed.message);
                        }
                    } catch {
                        console.warn("⚠️ Non-JSON message:", event.data);
                    }
                    return;
                }

                const arrayBuffer =
                    event.data instanceof Blob
                        ? await event.data.arrayBuffer()
                        : event.data;
                const view = new DataView(arrayBuffer);
                const metadataLength = view.getUint32(0);
                const metadataBytes = new Uint8Array(
                    arrayBuffer,
                    4,
                    metadataLength
                );
                const metadataText = new TextDecoder().decode(metadataBytes);
                const metadata = JSON.parse(metadataText);
                const xorname = metadata.xorname;
                const mimeType =
                    metadata.mimeType || "application/octet-stream";
                const fileBytes = new Uint8Array(
                    arrayBuffer,
                    4 + metadataLength
                );
                const base64Data = arrayBufferToBase64(fileBytes);

                const cb = pendingDownloads.get(xorname);
                if (cb) {
                    cb({ success: true, base64: base64Data, mimeType });
                    pendingDownloads.delete(xorname);
                }
            };

            socket.onerror = (err) => {
                console.error("WebSocket error:", err);
            };

            socket.onclose = () => {
                socketReady = false;
                connecting = false;
                chrome.storage.local.get(["connectionType"], (res2) => {
                    if (res2.connectionType === currentConnectionType) {
                        setTimeout(initWebSocket, retryDelay);
                        retryDelay = Math.min(retryDelay * 1.5, 10000);
                    }
                });
            };
        }
    );
}

function notifyUser(title, message) {
    const url = chrome.runtime.getURL(
        `feedback.html?title=${encodeURIComponent(
            title
        )}&message=${encodeURIComponent(message)}`
    );
    chrome.tabs.create({ url });
}

function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (
            request.action === "triggerSafeBoxClientDownload" &&
            isValidSafePath(request.xorname)
        ) {
            const xorname = request.xorname;
            pendingDownloads.set(xorname, sendResponse);

            if (socketReady && socket.readyState === WebSocket.OPEN) {
                socket.send(
                    JSON.stringify({ type: "download", address: xorname })
                );
            } else {
                ensureSocketConnected();
            }
            return true;
        }

        if (
            request.action === "triggerSafeBoxClientUploadChunk" &&
            request.fileChunk
        ) {
            return handleUploadChunk(request, sender.id, sendResponse);
        }

        if (request.action === "fetchAntTPPort") {
            const localPort = request.localPort || 8084;
            fetch(`http://127.0.0.1:${localPort}/getAntTPPort`)
                .then((res) => res.json())
                .then((data) =>
                    sendResponse({ success: true, antTPPort: data.port })
                )
                .catch((err) =>
                    sendResponse({ success: false, error: err.message })
                );
            return true;
        }

        if (request.action === "getLocalPort") {
            chrome.storage.local.get(["localClientPort"], (result) => {
                sendResponse({ port: result.localClientPort || 8084 });
            });
            return true;
        }

        if (request.action === "openAndClose" && request.url) {
            chrome.tabs.create({ url: request.url }, () => {
                if (sender.tab?.id) chrome.tabs.remove(sender.tab.id);
            });
        }

        sendResponse({ success: false, error: "Unknown Extension Request" });
        return false;
    } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
        return false;
    }
});
