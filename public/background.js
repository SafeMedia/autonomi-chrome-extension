const SAFE_PATH_REGEX = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;

function isValidSafePath(input) {
  return SAFE_PATH_REGEX.test(input) && !input.includes("..");
}

const fileChunks = {};
let socket;
let socketReady = false;
let pendingChunks = [];
let retryDelay = 2000;
let currentConnectionType = null;
let connecting = false;
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
    if (!socket || socket.readyState > 1 || currentConnectionType !== selectedOption) {
      initWebSocket();
    }
  });
}

function handleUploadChunk(request, senderId, sendResponse) {
  const { name, chunkIndex, totalChunks, data, mime_type } = request.fileChunk;
  const key = `${senderId}_${name}`;
  fileChunks[key] = fileChunks[key] || [];
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
    pendingChunks.push(message);
    sendResponse({ success: true, queued: true });
    ensureSocketConnected();
  }
}

function arrayBufferToBase64(buffer) {
  // Convert Uint8Array to binary string then to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function initWebSocket() {
  if (connecting) return;
  connecting = true;

  chrome.storage.local.get(["connectionType", "endpointUrls", "localClientPort"], async (res) => {
    const selectedOption = res.connectionType || "local";

    if (selectedOption === currentConnectionType && socket?.readyState <= 1) {
      connecting = false;
      return;
    }

    if (socket?.readyState <= 1) {
      socket.close();
    }

    let wsUrl = null;

    if (selectedOption === "endpoints") {
      const urls = Array.isArray(res.endpointUrls) ? res.endpointUrls : [];
      if (!urls.length) {
        notifyUser("Endpoint Error", "⚠️ No endpoint server URLs found. Add some in the settings.");
        connecting = false;
        return;
      }

      for (const url of urls) {
        try {
          await new Promise((resolve, reject) => {
            const testSocket = new WebSocket(url);
            let settled = false;

            testSocket.onopen = () => !settled && (settled = true, testSocket.close(), resolve());
            testSocket.onerror = testSocket.onclose = () => !settled && (settled = true, reject());

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
        notifyUser("Endpoint Error", "❌ No endpoint URLs could connect. Check their status.");
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

    socket.onopen = () => {
      socketReady = true;
      retryDelay = 2000;
      connecting = false;

      pendingChunks.forEach((chunk) => socket.send(chunk));
      pendingChunks = [];

      for (const [xorname] of pendingDownloads) {
        socket.send(xorname);
      }
    };

    socket.onmessage = async (event) => {
      const data = event.data;
      const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;

      const view = new DataView(arrayBuffer);
      const metadataLength = view.getUint32(0);
      const metadataBytes = new Uint8Array(arrayBuffer, 4, metadataLength);
      const metadataText = new TextDecoder().decode(metadataBytes);
      const metadata = JSON.parse(metadataText);

      const mimeType = metadata.mimeType || "application/octet-stream";
      const xorname = metadata.xorname;

      const fileBytes = new Uint8Array(arrayBuffer, 4 + metadataLength);
      
const base64Data = arrayBufferToBase64(fileBytes);
console.log("Received data length:", fileBytes.length, "xorname:", xorname);
console.log("Base64 sample:", base64Data.slice(0, 50));


      const cb = pendingDownloads.get(xorname);
      if (cb) {
        cb({ success: true, base64: base64Data, mimeType });
        pendingDownloads.delete(xorname);
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
  });
}

function notifyUser(title, message) {
  const url = chrome.runtime.getURL(`feedback.html?title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}`);
  chrome.tabs.create({ url });
}

// Internal messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "triggerSafeBoxClientDownload" && isValidSafePath(request.xorname)) {
      const { xorname } = request;
      pendingDownloads.set(xorname, sendResponse);

      if (socketReady && socket.readyState === WebSocket.OPEN) {
        socket.send(xorname);
      } else {
        ensureSocketConnected();
      }

      return true;
    }

    if (request.action === "triggerSafeBoxClientUploadChunk" && request.fileChunk) {
      handleUploadChunk(request, sender.id, sendResponse);
      return true;
    }

    sendResponse({ success: false, error: "Invalid message format" });
    return false;
  } catch (err) {
    sendResponse({ success: false, error: err.message || String(err) });
    return false;
  }
});

// External messaging
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  return chrome.runtime.onMessage.hasListeners
    ? chrome.runtime.onMessage.call(null, request, sender, sendResponse)
    : false;
});

// Omnibox search
chrome.omnibox.onInputEntered.addListener((text) => {
  chrome.storage.local.get(["connectionType", "endpointUrls"], async (res) => {
    const selectedOption = res.connectionType || "local";

    if (!isValidSafePath(text)) {
      notifyUser("Invalid Address", "The input is not a valid Autonomi address.");
      return;
    }

    if (selectedOption === "endpoints") {
      const urls = Array.isArray(res.endpointUrls) ? res.endpointUrls : [];
      if (urls.length === 0) {
        notifyUser("No Endpoints", "No endpoint URLs configured.");
        return;
      }

      // Optionally test if any endpoint is reachable
      let connected = false;
      for (const url of urls) {
        try {
          const testSocket = new WebSocket(url);
          await new Promise((resolve, reject) => {
            testSocket.onopen = () => (testSocket.close(), resolve());
            testSocket.onerror = testSocket.onclose = () => reject();
            setTimeout(() => reject(), 3000);
          });
          connected = true;
          break;
        } catch {}
      }

      if (!connected) {
        notifyUser("Connection Failed", "Could not connect to any endpoint servers.");
        return;
      }

      // Open the extension's viewer with the xorname
      const viewerUrl = chrome.runtime.getURL(`browser.html?xorname=${encodeURIComponent(text)}`);
      chrome.tabs.create({ url: viewerUrl });
      return;
    }

    if (selectedOption === "local") {
      const viewerUrl = chrome.runtime.getURL(`browser.html?xorname=${encodeURIComponent(text)}`);
      chrome.tabs.create({ url: viewerUrl });
    }
  });
});

