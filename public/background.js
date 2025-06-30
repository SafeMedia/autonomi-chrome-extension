const SAFE_PATH_REGEX = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;

function isValidSafePath(input) {
    return SAFE_PATH_REGEX.test(input) && !input.includes("..");
}

const LOCAL_PORT_KEY = "localClientPort";

const fileChunks = {};
let socket;
let socketReady = false;
let pendingChunks = [];
let retryDelay = 2000;
let currentConnectionType = null;
let connecting = false;
const pendingDownloads = new Map();
const pendingUploads = new Map();

async function directlyFetchAntTPPort(localPort) {
    const res = await fetch(`http://127.0.0.1:${localPort}/getAntTPPort`);
    const data = await res.json();
    return data.port;
}

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.connectionType) {
        console.log(
            "🔄 connectionType changed:",
            changes.connectionType.newValue
        );
        initWebSocket();
    }
});

function ensureSocketConnected() {
    chrome.storage.local.get(["connectionType"], (res) => {
        const selectedOption = res.connectionType || "local";
        if (
            !socket ||
            socket.readyState > 1 ||
            currentConnectionType !== selectedOption
        ) {
            initWebSocket();
        }
    });
}

function handleUploadChunk(request, senderId, sendResponse) {
    const { name, chunkIndex, totalChunks, data, mime_type } =
        request.fileChunk;

    // ✅ Store response callback only on first chunk
    if (chunkIndex === 0) {
        pendingUploads.set(name, sendResponse);
    }

    const metadata = {
        type: "upload",
        metadata: {
            filename: name,
            mime_type,
            chunk_index: chunkIndex,
            total_chunks: totalChunks,
        },
        chunk: arrayBufferToBase64(data),
    };

    const jsonMessage = JSON.stringify(metadata);

    if (socketReady && socket.readyState === WebSocket.OPEN) {
        socket.send(jsonMessage);
    } else {
        pendingChunks.push(jsonMessage);
        ensureSocketConnected();
    }

    // Keep port open until upload_complete received
    return true;
}

function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function initWebSocket() {
    if (connecting) return;
    connecting = true;

    chrome.storage.local.get(
        ["connectionType", "endpointUrls", "localClientPort"],
        async (res) => {
            const selectedOption = res.connectionType || "local";

            if (
                selectedOption === currentConnectionType &&
                socket?.readyState <= 1
            ) {
                connecting = false;
                return;
            }

            if (socket?.readyState <= 1) {
                socket.close();
            }

            let wsUrl = null;

            if (selectedOption === "endpoints") {
                const urls = Array.isArray(res.endpointUrls)
                    ? res.endpointUrls
                    : [];
                if (!urls.length) {
                    notifyUser(
                        "Endpoint Error",
                        "⚠️ No endpoint server URLs found. Add some in the settings."
                    );
                    connecting = false;
                    return;
                }

                for (const url of urls) {
                    try {
                        await new Promise((resolve, reject) => {
                            const testSocket = new WebSocket(url);
                            let settled = false;
                            testSocket.onopen = () =>
                                !settled &&
                                ((settled = true),
                                testSocket.close(),
                                resolve());
                            testSocket.onerror = testSocket.onclose = () =>
                                !settled && ((settled = true), reject());
                            setTimeout(() => {
                                if (!settled) {
                                    settled = true;
                                    testSocket.close();
                                    reject();
                                }
                            }, 5000);
                        });
                        wsUrl = url;
                        break;
                    } catch {}
                }

                if (!wsUrl) {
                    notifyUser(
                        "Endpoint Error",
                        "❌ No endpoint URLs could connect. Check their status."
                    );
                    connecting = false;
                    return;
                }
            } else if (selectedOption === "local") {
                const port = res.localClientPort || 8081;
                wsUrl = `ws://localhost:${port}`;
            } else {
                connecting = false;
                return;
            }

            currentConnectionType = selectedOption;
            socket = new WebSocket(wsUrl);
            socket.binaryType = "arraybuffer";

            socket.onopen = () => {
                socketReady = true;
                retryDelay = 2000;
                connecting = false;

                pendingChunks.forEach((chunk) => socket.send(chunk));
                pendingChunks = [];

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
                            parsed.xorname &&
                            parsed.filename
                        ) {
                            console.log("✅ Upload complete received:", parsed);
                            const cb = pendingUploads.get(parsed.filename);
                            if (cb) {
                                cb({ success: true, xorname: parsed.xorname });
                                pendingUploads.delete(parsed.filename);
                            }
                            return;
                        }
                    } catch (e) {
                        if (typeof event.data === "string") {
                            try {
                                const parsed = JSON.parse(event.data);

                                if (
                                    parsed.type === "upload_complete" &&
                                    parsed.xorname &&
                                    parsed.filename
                                ) {
                                    console.log(
                                        "✅ Upload complete received:",
                                        parsed
                                    );
                                    const cb = pendingUploads.get(
                                        parsed.filename
                                    );
                                    if (cb) {
                                        cb({
                                            success: true,
                                            xorname: parsed.xorname,
                                        });
                                        pendingUploads.delete(parsed.filename);
                                    }
                                    return;
                                }
                            } catch (e) {
                                console.warn(
                                    "⚠️ Received non-JSON string over socket:",
                                    event.data
                                );
                            }
                            return;
                        }
                    }
                    return;
                }

                const data = event.data;
                const arrayBuffer =
                    data instanceof Blob ? await data.arrayBuffer() : data;

                const view = new DataView(arrayBuffer);
                const metadataLength = view.getUint32(0);
                const metadataBytes = new Uint8Array(
                    arrayBuffer,
                    4,
                    metadataLength
                );
                const metadataText = new TextDecoder().decode(metadataBytes);
                const metadata = JSON.parse(metadataText);

                const mimeType =
                    metadata.mimeType || "application/octet-stream";
                const xorname = metadata.xorname;
                const fileBytes = new Uint8Array(
                    arrayBuffer,
                    4 + metadataLength
                );

                const base64Data = arrayBufferToBase64(fileBytes);

                const cb = pendingDownloads.get(xorname);
                if (cb) {
                    cb({ success: true, base64: base64Data, mimeType });
                    pendingDownloads.delete(xorname);
                } else {
                    console.warn(
                        "No pending callback found for xorname:",
                        xorname
                    );
                }
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (
            request.action === "triggerSafeBoxClientDownload" &&
            isValidSafePath(request.xorname)
        ) {
            const { xorname } = request;
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
            handleUploadChunk(request, sender.id, sendResponse);
            return true;
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
            return true; // important for async response
        }

        if (request.action === "getLocalPort") {
            chrome.storage.local.get(["localClientPort"], (result) => {
                sendResponse({ port: result.localClientPort || 8084 });
            });
            return true;
        }

        if (request.action === "openAndClose" && request.url) {
            chrome.tabs.create({ url: request.url }, () => {
                if (sender.tab && sender.tab.id) {
                    chrome.tabs.remove(sender.tab.id);
                }
            });
        }

        sendResponse({ success: false, error: "Unknown Extension Request" });
        return false;
    } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
        return false;
    }
});

chrome.runtime.onMessageExternal.addListener(
    (request, sender, sendResponse) => {
        return chrome.runtime.onMessage.hasListeners
            ? chrome.runtime.onMessage.call(null, request, sender, sendResponse)
            : false;
    }
);

chrome.omnibox.onInputEntered.addListener((text) => {
    chrome.storage.local.get(
        ["connectionType", "endpointUrls", "localClientPort"],
        async (res) => {
            const selectedOption = res.connectionType || "local";
            const localClientPort = res.localClientPort || 8084;

            if (!isValidSafePath(text)) {
                notifyUser(
                    "Invalid Address",
                    "The input is not a valid Autonomi address."
                );
                return;
            }

            if (selectedOption === "local") {
                try {
                    const antTPPort = await directlyFetchAntTPPort(
                        localClientPort
                    );
                    const trimmed = text.replace(/^\/+/, "");
                    const baseURL = `http://127.0.0.1:${antTPPort}/${trimmed}`;

                    console.log("Opening tab at:", baseURL);

                    chrome.tabs.create({ url: baseURL });
                } catch (err) {
                    notifyUser(
                        "Error",
                        "Could not resolve AntTP port: " + err.message
                    );
                }
            } else if (selectedOption === "endpoints") {
                const urls = Array.isArray(res.endpointUrls)
                    ? res.endpointUrls
                    : [];
                if (!urls.length) {
                    notifyUser("No Endpoints", "No endpoint URLs configured.");
                    return;
                }

                let connected = false;
                for (const url of urls) {
                    try {
                        const testSocket = new WebSocket(url);
                        await new Promise((resolve, reject) => {
                            testSocket.onopen = () => (
                                testSocket.close(), resolve()
                            );
                            testSocket.onerror = testSocket.onclose = () =>
                                reject();
                            setTimeout(() => reject(), 3000);
                        });
                        connected = true;
                        break;
                    } catch {}
                }

                if (!connected) {
                    notifyUser(
                        "Connection Failed",
                        "Could not connect to any endpoint servers."
                    );
                    return;
                }

                // TODO open the server URL
            }
        }
    );
});
