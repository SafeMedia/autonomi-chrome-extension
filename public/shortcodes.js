function parseAutonomiCode(code) {
    const parts = code.split(",");
    if (parts[0] !== "autocode" || parts.length < 3) return null;

    return {
        full: code,
        xorname: parts[1],
        ext: parts[2].toLowerCase(),
        width: parts[3] ? parseInt(parts[3]) : null,
        height: parts[4] ? parseInt(parts[4]) : null,
    };
}

function dataUrlToBlobUrl(dataUrl, mimeType) {
    try {
        const parts = dataUrl.split(",");
        if (parts.length < 2 || !parts[1]) throw new Error("Invalid data URL");
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mimeType });
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error(
            "❌ Failed to convert data URL to Blob URL:",
            err.message
        );
        return null;
    }
}

function createElementForFile({ xorname = null, ext, url, width, height }) {
    const imgExts = ["jpg", "jpeg", "png", "gif", "webp"];
    const videoExts = ["mp4", "webm", "ogg"];
    const audioExts = ["mp3", "wav", "ogg"];
    const pdfExts = ["pdf"];

    ext = ext.toLowerCase();

    function createFallbackLink() {
        const viewerUrl = xorname
            ? chrome.runtime.getURL(
                  `viewer.html?xorname=${encodeURIComponent(
                      xorname
                  )}&ext=${ext}`
              )
            : url;

        const link = document.createElement("a");
        link.href = viewerUrl;
        link.textContent = `📄 Open ${ext.toUpperCase()} in viewer`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        return link;
    }

    function attachErrorHandler(el) {
        el.onerror = () => {
            el.replaceWith(createFallbackLink());
        };
        return el;
    }

    if (imgExts.includes(ext)) {
        const mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
        const blobUrl = dataUrlToBlobUrl(url, mime);
        if (!blobUrl) return createFallbackLink();
        const img = document.createElement("img");
        img.src = blobUrl;
        img.alt = "Loaded from SafeBox";
        if (width) img.width = width;
        if (height) img.height = height;
        return attachErrorHandler(img);
    }

    if (videoExts.includes(ext)) {
        const mime = `video/${ext}`;
        const blobUrl = dataUrlToBlobUrl(url, mime);
        if (!blobUrl) return createFallbackLink();
        const video = document.createElement("video");
        video.src = blobUrl;
        video.controls = true;
        video.style.maxWidth = "100%";
        if (width) video.width = width;
        if (height) video.height = height;
        return attachErrorHandler(video);
    }

    if (audioExts.includes(ext)) {
        const mime = `audio/${ext}`;
        const blobUrl = dataUrlToBlobUrl(url, mime);
        if (!blobUrl) return createFallbackLink();
        const audio = document.createElement("audio");
        audio.src = blobUrl;
        audio.controls = true;
        audio.style.display = "block";
        return attachErrorHandler(audio);
    }

    if (pdfExts.includes(ext)) {
        return createFallbackLink();
    }

    const link = document.createElement("a");
    link.href = url;
    link.textContent = `Download ${ext} from Autonomi`;
    link.target = "_blank";
    return link;
}

function downloadFileData(parsed) {
    return new Promise((resolve) => {
        console.log("Requesting download for xorname:", parsed.xorname);
        chrome.runtime.sendMessage(
            {
                action: "triggerSafeBoxClientDownloadDataUrl",
                xorname: parsed.xorname,
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error(
                        "❌ Runtime message error:",
                        chrome.runtime.lastError.message
                    );
                } else {
                    console.log("✅ Got message response:", response);
                }
                resolve({ response, parsed });
            }
        );
    });
}

function injectSpinnerStyles() {
    if (document.getElementById("autonomi-spinner-style")) return;

    const style = document.createElement("style");
    style.id = "autonomi-spinner-style";
    style.textContent = `
.autonomi-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #ccc;
  border-top-color: #3498db;
  border-radius: 50%;
  animation: autonomi-spin 1s linear infinite;
  vertical-align: middle;
  margin: 0 4px;
}
@keyframes autonomi-spin {
  to { transform: rotate(360deg); }
}
`;
    document.head.appendChild(style);
}

async function replaceAutonomiCodesInTextNodes() {
    injectSpinnerStyles();

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const regex =
        /autocode,[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]*)*,[a-z0-9]+(?:,\d+,\d+)?/gi;

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.nodeValue;
        if (!regex.test(text)) continue;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        regex.lastIndex = 0;

        for (const match of text.matchAll(regex)) {
            const matchedText = match[0];
            const index = match.index;

            fragment.appendChild(
                document.createTextNode(text.substring(lastIndex, index))
            );

            const parsed = parseAutonomiCode(matchedText);
            if (!parsed) {
                fragment.appendChild(document.createTextNode(matchedText));
                lastIndex = index + matchedText.length;
                continue;
            }

            if (parsed.ext === "pdf") {
                const link = createElementForFile({
                    xorname: parsed.xorname,
                    ext: parsed.ext,
                    url: "",
                    width: parsed.width,
                    height: parsed.height,
                });
                fragment.appendChild(link);
                lastIndex = index + matchedText.length;
                continue;
            }

            const spinner = document.createElement("span");
            spinner.className = "autonomi-spinner";
            fragment.appendChild(spinner);

            downloadFileData(parsed).then(({ response }) => {
                const replacement =
                    response && response.success && response.url
                        ? createElementForFile({
                              xorname: parsed.xorname,
                              ext: parsed.ext,
                              url: response.url,
                              width: parsed.width,
                              height: parsed.height,
                          })
                        : createElementForFile({
                              xorname: parsed.xorname,
                              ext: parsed.ext,
                              url: "", // fallback viewer doesn't use this
                              width: parsed.width,
                              height: parsed.height,
                          });

                spinner.replaceWith(replacement);
            });

            lastIndex = index + matchedText.length;
        }

        fragment.appendChild(
            document.createTextNode(text.substring(lastIndex))
        );

        node.parentNode.replaceChild(fragment, node);
    }
}

let debounceTimeout;
const observer = new MutationObserver(() => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        replaceAutonomiCodesInTextNodes();
    }, 200);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
});

replaceAutonomiCodesInTextNodes();
