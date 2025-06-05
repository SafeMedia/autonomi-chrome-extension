function isValidSafePath(input) {
  const pathRegex = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;
  return pathRegex.test(input) && !input.includes("..");
}


const fileChunks = {};
let socket;
let socketReady = false;
let pendingChunks = [];
let retryDelay = 2000;
let currentConnectionType = null;
const pendingDownloads = new Map();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.connectionType) {
    console.log("🔄 connectionType changed:", changes.connectionType.newValue);
    initWebSocket();
  }
});

function ensureSocketConnected() {
  chrome.storage.local.get(["connectionType"], (res) => {
    const selectedOption = res.connectionType || "local";
    if (!socket || socket.readyState > 1) {
      console.log("🔄 Reinitializing WebSocket...");
      initWebSocket(); // will handle correct socket based on selectedOption
    } else if (currentConnectionType !== selectedOption) {
      console.log("🔄 Connection type changed, reinitializing WebSocket...");
      initWebSocket(); // force a reinit to new ws target
    }
  });
}

function initWebSocket() {
  const STORAGE_KEY = "connectionType";

  chrome.storage.local.get([STORAGE_KEY], (res) => {
    const selectedOption = res[STORAGE_KEY] || "";

    // If no change, skip reinitialization
    if (selectedOption === currentConnectionType && socket && socket.readyState <= 1) {
      console.log("🔁 WebSocket already initialized for current connectionType:", selectedOption);
      return;
    }

    // Close existing socket if needed
    if (socket && socket.readyState <= 1) {
      console.log("🔌 Closing old WebSocket before switching mode...");
      socket.close();
    }

    let wsUrl = null;

    if (selectedOption === "endpoints") {
      // TODO - update this to be highest priority endpoint url
      // and if not sucessful try local priorities
      wsUrl = "wss://server-url.app";
    } else if (selectedOption === "local") {
      wsUrl = "wss://localhost:1420";
    } else {
      console.log("🛑 No valid WebSocket config for:", selectedOption);
      return;
    }

    console.log(`🌐 Opening WebSocket: ${wsUrl}`);
    currentConnectionType = selectedOption;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
      socketReady = true;
      retryDelay = 2000;

      // Send pending chunks
      pendingChunks.forEach((chunk) => socket.send(chunk));
      pendingChunks = [];

      // Retry downloads
      for (const [xorname] of pendingDownloads) {
        console.log("🔁 Retrying download:", xorname);
        socket.send(xorname);
      }
    };

    socket.onmessage = async (event) => {
      // (same file handling as before)
    };

    socket.onerror = (error) => {
      console.error("🚨 WebSocket error:", error);
    };

    socket.onclose = () => {
      console.warn("🔌 WebSocket closed");

      socketReady = false;

      // Retry only if connection type is still valid
      chrome.storage.local.get([STORAGE_KEY], (res2) => {
        if (res2[STORAGE_KEY] === currentConnectionType) {
          setTimeout(initWebSocket, retryDelay);
          retryDelay = Math.min(retryDelay * 1.5, 10000);
        } else {
          console.log("ℹ️ Not retrying WebSocket, connectionType has changed.");
        }
      });
    };
  });
}



// Re-enable when websocket support added to anttp
// Start socket
// setTimeout(initWebSocket, 1000); 


// Handle extenson messages for internal sources
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log("📩 Received internal message:", request);

    if (request.action === "triggerSafeBoxClientDownload" && isValidSafePath(request.xorname)) {
      const { xorname } = request;

      if (socketReady && socket.readyState === WebSocket.OPEN) {
        console.log("⬇️ Sending download request:", xorname);
        pendingDownloads.set(xorname, sendResponse);
        socket.send(xorname);
      } else {
        console.warn("🕓 Socket not ready, deferring download:", xorname);
        pendingDownloads.set(xorname, sendResponse);
        ensureSocketConnected();
      }

      // Indicate async response
      return true;
    }  else if (request.action === "triggerSafeBoxClientUploadChunk" && request.fileChunk) {
      const { name, chunkIndex, totalChunks, data, mime_type } = request.fileChunk;
      const key = `${sender.id}_${name}`;
      if (!fileChunks[key]) fileChunks[key] = [];
      fileChunks[key][chunkIndex] = new Uint8Array(data);

      const message = JSON.stringify({
        name,
        mime_type,
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
        data: Array.from(new Uint8Array(data)),
      });

      if (socketReady && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        sendResponse({ success: true });
      } else {
        console.warn("⏳ Socket not ready, queueing chunk");
        pendingChunks.push(message);
        sendResponse({ success: true, queued: true });
        ensureSocketConnected();
      }

      return true;

    } else {
      console.warn("⚠️ Invalid message format:", request);
      sendResponse({ success: false, error: "Invalid message format" });
      return false;
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    sendResponse({ success: false, error: err.message || String(err) });
    return false;
  }
});




// Handle extension messages for external sources
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  try {
    console.log("📩 Received request:", request);

   if (request.action === "triggerSafeBoxClientDownload" && isValidSafePath(request.xorname)) {
  const { xorname } = request;

  if (socketReady && socket.readyState === WebSocket.OPEN) {
    console.log("⬇️ Sending download request:", xorname);
    pendingDownloads.set(xorname, sendResponse);
    socket.send(xorname);
  } else {
    console.warn("🕓 Socket not ready, deferring download:", xorname);
    pendingDownloads.set(xorname, sendResponse);
    ensureSocketConnected();
  }

  return true;
} else if (request.action === "triggerSafeBoxClientUploadChunk" && request.fileChunk) {
      const { name, chunkIndex, totalChunks, data, mime_type } = request.fileChunk;
      const key = `${sender.id}_${name}`;
      if (!fileChunks[key]) fileChunks[key] = [];
      fileChunks[key][chunkIndex] = new Uint8Array(data);

      const message = JSON.stringify({
        name,
        mime_type,
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
        data: Array.from(new Uint8Array(data)),
      });

      if (socketReady && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
        sendResponse({ success: true });
      } else {
        console.warn("⏳ Socket not ready, queueing chunk");
        pendingChunks.push(message);
        sendResponse({ success: true, queued: true });
        ensureSocketConnected();
      }

      return true;

    } else {
      console.warn("⚠️ Invalid message format:", request);
      sendResponse({ success: false, error: "Invalid message format" });
      return false;
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    sendResponse({ success: false, error: err.message || String(err) });
    return false;
  }
});

chrome.omnibox.onInputEntered.addListener((text) => {
  const STORAGE_KEY = "connectionType";
  const LOCAL_PORT_KEY = "localPort";

  chrome.storage.local.get([STORAGE_KEY, LOCAL_PORT_KEY], (res) => {
    let selectedOption = res[STORAGE_KEY] || "local";
    console.log("Connection type is:", selectedOption);

   let port = res[LOCAL_PORT_KEY] || '8080';


    const isValidXorname = (input) => {
      const regex = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;
      return regex.test(input) && !input.includes("..");
    };

    if (selectedOption === "endpoints") {
      const title = encodeURIComponent("Not Supported");
      const message = encodeURIComponent("Endpoint servers are not currently supported.");
      const feedbackUrl = chrome.runtime.getURL(`feedback.html?title=${title}&message=${message}`);
      chrome.tabs.create({ url: feedbackUrl });
      return;
    }

    if (!isValidXorname(text)) {
      const title = encodeURIComponent("Invalid Address");
      const message = encodeURIComponent("The input is not a valid Autonomi address.");
      const feedbackUrl = chrome.runtime.getURL(`feedback.html?title=${title}&message=${message}`);
      chrome.tabs.create({ url: feedbackUrl });
      return;
    }

   fetch(`http://127.0.0.1:${port}`, { method: "HEAD" })

      .then(() => {
        chrome.tabs.create({ url: `http://localhost:${port}/${text}` });
      })
      .catch(() => {
        const title = encodeURIComponent("No Connection");
        const message = encodeURIComponent("Could not connect to the local client.");
        const feedbackUrl = chrome.runtime.getURL(`feedback.html?title=${title}&message=${message}`);
        chrome.tabs.create({ url: feedbackUrl });
      });
  });
});
