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
            const ws = new WebSocket("ws://localhost:1420/download-ws");

            ws.onopen = () => {
                ws.send(JSON.stringify({ xorname: request.xorname, action: 'download' }));
            };
        
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
        
                    if (message.error) {
                        sendResponse({ success: false, error: message.error });
                    } else if (message.data) {
                        // Expecting `data` to be an array of bytes
                        sendResponse({
                            success: true,
                            mimeType: message.mimeType || "application/octet-stream",
                            data: message.data,
                        });
                    } else {
                        sendResponse({ success: false, error: "No data received" });
                    }
                } catch (e) {
                    sendResponse({ success: false, error: "Invalid response from client" });
                } finally {
                    ws.close();
                }
            };
        
            ws.onerror = () => {
                sendResponse({ success: false, error: "WebSocket error" });
            };
        
            return true; // Required for async sendResponse
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


// listen for omnibox keyword input
chrome.omnibox.onInputEntered.addListener((text) => {
   
    const xorname = text.trim();
  
    if (isValidXorname(xorname)) {
     
      const ws = new WebSocket("ws://localhost:1420/download-ws");
  
  
      ws.onopen = () => {
        console.log(`Sending download request for xorname: ${xorname}`);
        
       
        ws.send(JSON.stringify({ xorname: xorname, action: 'download' }));
      };
  
      // when a message is received from the WebSocket server
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
  
          if (message.error) {
            console.error("Download failed:", message.error);
            alert(`Error: ${message.error}`);
          } else if (message.data) {
            // file data received
            const blob = new Blob([new Uint8Array(message.data)], { type: message.mimeType || "application/octet-stream" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = xorname; // use xorname as file name
            link.click();
            console.log("Download initiated for file:", xorname);
          } else {
            console.error("No data received in WebSocket response");
          }
        } catch (e) {
          console.error("Error processing WebSocket message:", e);
          alert("Failed to process the server's response.");
        } finally {
          ws.close(); // close the WebSocket connection
        }
      };
  
      // handle WebSocket error
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        alert("An error occurred while connecting to the WebSocket server.");
      };
    } else {
      alert("Invalid xorname. Please enter a valid xorname.");
    }
  });
  
