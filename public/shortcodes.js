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

function createElementForFile({ xorname = null, ext, url, width, height }) {
    const imgExts = ["jpg", "jpeg", "png", "gif", "webp"];
    const videoExts = ["mp4", "webm", "ogg"];
    const audioExts = ["mp3", "wav", "ogg"];
    const pdfExts = ["pdf"];

    ext = ext.toLowerCase();

    if (imgExts.includes(ext)) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Loaded from SafeBox";
        if (width) img.width = width;
        if (height) img.height = height;
        return img;
    }

    if (videoExts.includes(ext)) {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.style.maxWidth = "100%";
        if (width) video.width = width;
        if (height) video.height = height;
        return video;
    }

    if (audioExts.includes(ext)) {
        const audio = document.createElement("audio");
        audio.src = url;
        audio.controls = true;
        audio.style.display = "block";
        return audio;
    }

    if (pdfExts.includes(ext)) {
        if (!xorname) {
            const fallback = document.createElement("a");
            fallback.href = url;
            fallback.textContent = "📄 Download PDF";
            fallback.target = "_blank";
            fallback.rel = "noopener noreferrer";
            return fallback;
        }

        const viewLink = document.createElement("a");
        viewLink.href = chrome.runtime.getURL(
            `viewer.html?xorname=${encodeURIComponent(xorname)}&ext=${ext}`
        );
        viewLink.textContent = "🔎 View PDF securely";
        viewLink.target = "_blank";
        viewLink.rel = "noopener noreferrer";
        return viewLink;
    }

    // Fallback: simple download link
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

// Inject spinner styles once
function injectSpinnerStyles() {
    if (document.getElementById("autonomi-spinner-style")) return; // already injected

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
        regex.lastIndex = 0; // Reset regex state before use
        for (const match of text.matchAll(regex)) {
            const matchedText = match[0];
            const index = match.index;

            // add text before the match
            fragment.appendChild(
                document.createTextNode(text.substring(lastIndex, index))
            );

            // parse shortcode
            const parsed = parseAutonomiCode(matchedText);
            if (!parsed) {
                // if parsing failed, just add the original text
                fragment.appendChild(document.createTextNode(matchedText));
                lastIndex = index + matchedText.length;
                continue;
            }

            // For PDFs: skip downloading, create link immediately
            if (parsed.ext === "pdf") {
                const link = createElementForFile({
                    xorname: parsed.xorname,
                    ext: parsed.ext,
                    url: "", // no direct URL needed for viewer link
                    width: parsed.width,
                    height: parsed.height,
                });
                fragment.appendChild(link);
                lastIndex = index + matchedText.length;
                continue;
            }

            // For other file types, show spinner then download & replace
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
                        : document.createTextNode(
                              `[Failed to load: ${parsed.xorname}]`
                          );

                spinner.replaceWith(replacement);
            });

            lastIndex = index + matchedText.length;
        }

        // add any remaining text after the last match
        fragment.appendChild(
            document.createTextNode(text.substring(lastIndex))
        );

        // replace original text node with the new fragment
        node.parentNode.replaceChild(fragment, node);
    }
}

let debounceTimeout;
const observer = new MutationObserver(() => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        replaceAutonomiCodesInTextNodes();
    }, 200); // wait 200ms after last mutation batch
});

// start observing document.body for added/removed nodes and subtree changes
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
});

// run once immediately to process existing content
replaceAutonomiCodesInTextNodes();
