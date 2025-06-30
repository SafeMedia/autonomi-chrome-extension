function injectHTML() {
    fetch(chrome.runtime.getURL("/inject.html"))
        .then((res) => res.text())
        .then((html) => {
            const wrapper = document.createElement("div");
            wrapper.id = "autonomi-toolbar-wrapper";
            wrapper.style.position = "fixed";
            wrapper.style.top = "0";
            wrapper.style.left = "0";
            wrapper.style.right = "0";
            wrapper.style.zIndex = "2147483647";
            wrapper.innerHTML = html;

            const tryInsert = () => {
                if (document.body && document.documentElement) {
                    document.body.insertBefore(
                        wrapper,
                        document.body.firstChild
                    );

                    const toolbar = wrapper.querySelector("#autonomi-toolbar");

                    // after layout
                    requestAnimationFrame(() => {
                        const toolbarHeight = toolbar.offsetHeight;

                        // push page content down
                        document.body.style.marginTop = `${toolbarHeight}px`;
                        document.documentElement.style.scrollPaddingTop = `${toolbarHeight}px`;

                        // offset fixed elements top if they overlap toolbar
                        function offsetFixedElements() {
                            document.querySelectorAll("*").forEach((el) => {
                                const style = getComputedStyle(el);
                                if (
                                    style.position === "fixed" &&
                                    !wrapper.contains(el) &&
                                    parseFloat(style.top) < toolbarHeight
                                ) {
                                    const originalTop = parseFloat(style.top);
                                    el.style.top = `${
                                        originalTop + toolbarHeight
                                    }px`;
                                }
                            });
                        }

                        offsetFixedElements();

                        // future additions of fixed elements and offset them
                        const observer = new MutationObserver(() => {
                            offsetFixedElements();
                        });
                        observer.observe(document.body, {
                            childList: true,
                            subtree: true,
                        });
                    });

                    // set image src for logo
                    const img = document.getElementById("headerLogo");
                    if (img) {
                        img.src = chrome.runtime.getURL(
                            "images/header-light.png"
                        );
                    }

                    setupEventListeners();
                } else {
                    setTimeout(tryInsert, 50);
                }
            };

            tryInsert();
        })
        .catch((err) => console.error("Could not load inject.html", err));
}

async function fetchAntTPPort(localPort) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: "fetchAntTPPort", localPort },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response?.success) {
                    resolve(response.antTPPort);
                } else {
                    reject(
                        new Error(
                            response?.error ||
                                "Unknown error fetching AntTP port"
                        )
                    );
                }
            }
        );
    });
}

function showToast(message, duration = 3000) {
    // check if toast container exists, else create it
    let container = document.getElementById("autonomi-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "autonomi-toast-container";
        Object.assign(container.style, {
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: 2147483647,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            pointerEvents: "none",
            fontFamily: "sans-serif",
        });
        document.body.appendChild(container);
    }

    // create the toast
    const toast = document.createElement("div");
    Object.assign(toast.style, {
        background: "rgba(51, 51, 51, 0.9)",
        color: "white",
        padding: "12px 20px",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        fontSize: "14px",
        pointerEvents: "auto",
        opacity: "0",
        transition: "opacity 0.3s ease",
    });

    toast.textContent = message;
    container.appendChild(toast);

    // animate in
    requestAnimationFrame(() => {
        toast.style.opacity = "1";
    });

    // hide after duration and remove
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.addEventListener("transitionend", () => {
            toast.remove();
            // Remove container if no toasts left
            if (container.childElementCount === 0) {
                container.remove();
            }
        });
    }, duration);
}

function setupEventListeners() {
    const xorInput = document.getElementById("xornameInput");
    const searchBtn = document.getElementById("searchBtn");
    const downloadBtn = document.getElementById("downloadBtn");

    downloadBtn.disabled = false;

    function isValidXorname(input) {
        const regex = /^[a-f0-9]{64}(\/[-\w._~:@!$&'()*+,;=]+)*$/i;
        return regex.test(input) && !input.includes("..");
    }

    async function getLocalClientPort() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: "getLocalPort" },
                (response) => {
                    resolve(response?.port || 8084);
                }
            );
        });
    }

    async function handleSearch() {
        const value = xorInput.value.trim();
        if (!value) return;

        if (!isValidXorname(value)) {
            showToast("Invalid Autonomi path");
            return;
        }

        try {
            const localClientPort = await getLocalClientPort();
            const antTPPort = await fetchAntTPPort(localClientPort);
            const trimmed = value.replace(/^\/+/, "");
            const baseUrl = `http://127.0.0.1:${antTPPort}/${trimmed}`;

            chrome.runtime.sendMessage({
                action: "openAndClose",
                url: baseUrl,
            });
        } catch (err) {
            console.error("Error during search flow:", err);
            alert("Error: " + err.message);
        }
    }
    function handleDownload() {
        const wrapper = document.getElementById("autonomi-toolbar-wrapper");

        // query all media elements that are not inside the wrapper
        const mediaElements = [
            ...document.querySelectorAll("img[src], video[src], audio[src]"),
        ].filter((el) => !wrapper.contains(el));

        const videoSources = [
            ...document.querySelectorAll("video source[src]"),
        ].filter((el) => !wrapper.contains(el));

        const audioSources = [
            ...document.querySelectorAll("audio source[src]"),
        ].filter((el) => !wrapper.contains(el));

        const mediaUrls = mediaElements
            .map((el) => el.src)
            .concat(videoSources.map((el) => el.src))
            .concat(audioSources.map((el) => el.src))
            .filter(Boolean);

        if (mediaUrls.length === 1) {
            const mediaUrl = mediaUrls[0];
            downloadURL(mediaUrl);
        } else {
            downloadHTMLPage();
        }
    }

    function downloadURL(url) {
        const a = document.createElement("a");
        a.href = url;
        // try to get filename from URL
        const filename =
            url.split("/").pop().split("?")[0] || "downloaded_media";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    function downloadHTMLPage() {
        const htmlContent = document.documentElement.outerHTML;
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);

        const currentUrl = new URL(window.location.href);

        // get pathname without leading or trailing slash
        let pathPart = currentUrl.pathname;
        if (pathPart.startsWith("/")) pathPart = pathPart.slice(1);
        if (pathPart.endsWith("/")) pathPart = pathPart.slice(0, -1);

        // if path is empty, fallback to 'page'
        if (!pathPart) pathPart = "page";

        // replace slashes with underscores to make a safe filename
        pathPart = pathPart.replace(/\//g, "_");

        // Add html extension
        const filename = `${pathPart}.html`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    searchBtn.addEventListener("click", handleSearch);
    downloadBtn.addEventListener("click", handleDownload);
    xorInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleSearch();
    });
}

injectHTML();
