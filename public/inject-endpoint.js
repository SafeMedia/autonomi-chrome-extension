const URLS_KEY = "endpointUrls";

function shouldInjectOnCurrentPage(endpointUrls) {
    if (!endpointUrls || !endpointUrls.length) return false;

    const anttpUrls = endpointUrls.flatMap((domain) => [
        `https://anttp.${domain}`,
        `http://anttp.${domain}`,
    ]);

    const currentOrigin = window.location.origin;

    return anttpUrls.some((allowedUrl) => currentOrigin.startsWith(allowedUrl));
}

function injectHTML() {
    fetch(chrome.runtime.getURL("/inject-endpoint.html"))
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

                    requestAnimationFrame(() => {
                        const toolbarHeight = toolbar.offsetHeight;

                        document.body.style.marginTop = `${
                            toolbarHeight + 8
                        }px`;
                        document.documentElement.style.scrollPaddingTop = `${
                            toolbarHeight + 8
                        }px`;

                        const spacer = document.createElement("div");
                        spacer.style.height = "8px";
                        spacer.style.width = "100%";
                        spacer.style.position = "fixed";
                        spacer.style.top = `${toolbarHeight}px`;
                        spacer.style.left = "0";
                        spacer.style.zIndex = "2147483646"; // just below toolbar
                        spacer.style.background =
                            getComputedStyle(document.body).backgroundColor ||
                            "#fff";
                        wrapper.appendChild(spacer);

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
                                        originalTop + toolbarHeight + 8
                                    }px`;
                                }
                            });
                        }

                        offsetFixedElements();

                        const observer = new MutationObserver(() => {
                            offsetFixedElements();
                        });
                        observer.observe(document.body, {
                            childList: true,
                            subtree: true,
                        });
                    });

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

function setupEventListeners() {
    const xorInput = document.getElementById("xornameInput");
    const searchBtn = document.getElementById("searchBtn");
    const downloadBtn = document.getElementById("downloadBtn");

    function isValidXorname(input) {
        const regex = /^[a-f0-9]{64}(\/[-\w._~:@!$&'()*+,;=]*)*\/?$/i;
        return regex.test(input) && !input.includes("..");
    }

    async function handleSearch() {
        const value = xorInput.value.trim();
        if (!value) return;

        if (!isValidXorname(value)) {
            showToast("Invalid Autonomi path");
            return;
        }

        try {
            const trimmed = value.replace(/^\/+/, "");
            const currentOrigin = window.location.origin;
            const baseUrl = `${currentOrigin}/${trimmed}`;

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
            downloadURL(mediaUrls[0]);
        } else {
            downloadHTMLPage();
        }
    }

    function downloadURL(url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = url.split("/").pop().split("?")[0] || "downloaded_media";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function downloadHTMLPage() {
        const htmlContent = document.documentElement.outerHTML;
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const path =
            location.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "_") ||
            "page";

        const a = document.createElement("a");
        a.href = url;
        a.download = `${path}.html`;
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

    searchBtn.addEventListener("mouseover", () => {
        searchBtn.style.background = "#555";
    });
    searchBtn.addEventListener("mouseout", () => {
        searchBtn.style.background = "#7c7c7c";
    });
    downloadBtn.addEventListener("mouseover", () => {
        downloadBtn.style.background = "#555";
    });
    downloadBtn.addEventListener("mouseout", () => {
        downloadBtn.style.background = "#7c7c7c";
    });
}

function showToast(message, duration = 3000) {
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
    requestAnimationFrame(() => {
        toast.style.opacity = "1";
    });

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.addEventListener("transitionend", () => {
            toast.remove();
            if (container.childElementCount === 0) {
                container.remove();
            }
        });
    }, duration);
}

// first get stored endpointUrls, then check if current page matches allowed domains,
// only then inject UI

chrome.storage.local.get(URLS_KEY, ({ [URLS_KEY]: endpointUrls }) => {
    if (shouldInjectOnCurrentPage(endpointUrls)) {
        injectHTML();
    } else {
        // not in allowed domain, do nothing
    }
});
