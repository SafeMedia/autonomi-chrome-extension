function isValidXorname(input) {
    const xornamePattern = /^[a-f0-9]{64}$/i;
    return xornamePattern.test(input);
}

const fileChunks = {};
let socket;
let socketReady = false;
let pendingChunks = [];


function initWebSocket() {
    socket = new WebSocket("ws://localhost:1420/upload-ws");

    socket.onopen = () => {
        console.log("WebSocket connected");
        socketReady = true;
        pendingChunks.forEach((chunk) => socket.send(chunk));
        pendingChunks = [];
    };

    socket.onmessage = (event) => {
        console.log("Received message from server:", event.data);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
        console.warn("WebSocket closed, attempting reconnect...");
        socketReady = false;
        setTimeout(initWebSocket, 2000);
    };
}

initWebSocket();

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === "triggerSafeBoxClientDownload" && request.xorname) {
            fetch(`http://localhost:1420/download-file?xorname=${encodeURIComponent(request.xorname)}`)
                .then(response => response.blob())
                .then(blob => {
                    blob.arrayBuffer().then(buffer => {
                        const uint8Array = new Uint8Array(buffer);
                        sendResponse({
                            success: true,
                            mimeType: blob.type,
                            data: Array.from(uint8Array),
                        });
                    });
                })
                .catch(error => sendResponse({ success: false, error: error.message }));

            return true; // async
        } else if (request.action === "triggerSafeBoxClientUploadChunk" && request.fileChunk) {
            const { name, chunkIndex, totalChunks, data, mime_type } = request.fileChunk;
            const key = `${sender.id}_${name}`;

            if (!fileChunks[key]) {
                fileChunks[key] = [];
            }

            fileChunks[key][chunkIndex] = new Uint8Array(data);

            const message = JSON.stringify({
                name,
                mime_type: mime_type,
                chunk_index: chunkIndex,
                total_chunks: totalChunks,
                data: Array.from(new Uint8Array(data)),
            });

            if (socketReady && socket.readyState === WebSocket.OPEN) {
                socket.send(message);
                sendResponse({ success: true });
            } else {
                console.warn("WebSocket not ready, queueing chunk");
                pendingChunks.push(message);
                sendResponse({ success: true, queued: true });
            }

            return true;
        } else {
            console.warn("Invalid message received:", request);
            sendResponse({ success: false, error: "Invalid message format" });
            return false;
        }
    } catch (err) {
        console.error("Unexpected error:", err);
        sendResponse({
            success: false,
            error: (err && err.message) ? err.message : String(err),
        });
        return false;
    }
});
