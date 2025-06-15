import ReactDOM from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import headerLogo from "../public/images/header-light.png";
import "./tailwind.css";

function isValidXorname(_input: string): boolean {
    return true; // Customize validation if needed
}

async function fetchText(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.text();
}

function absoluteUrl(base: string, relative: string) {
    try {
        return new URL(relative, base).toString();
    } catch {
        return relative;
    }
}

function DWebBrowser() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [xorname, setXorname] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("xorname") || "";
    });

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (xorname) handleSearch();
    }, []);

    async function handleSearch() {
        setError("");
        setLoading(true);

        if (!isValidXorname(xorname)) {
            setLoading(false);
            setError("Invalid dweb path.");
            return;
        }

        chrome.storage.local.get(
            ["connectionType", "localPort"],
            async (res) => {
                const connectionType = res.connectionType || "local";
                const localPort = res.localPort || "8083";

                if (
                    connectionType !== "local" &&
                    connectionType !== "endpoints"
                ) {
                    setLoading(false);
                    setError("No valid connection mode selected.");
                    return;
                }

                try {
                    const baseUrl = `http://127.0.0.1:${localPort}/dweb-open/v/${xorname}`;
                    const html = await fetchText(baseUrl);
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");

                    // 🛡️ Remove <meta http-equiv="Content-Security-Policy">
                    doc.querySelectorAll(
                        "meta[http-equiv='Content-Security-Policy']"
                    ).forEach((meta) => meta.remove());

                    // Inline external CSS
                    const cssContents = await Promise.all(
                        Array.from(
                            doc.querySelectorAll("link[rel='stylesheet']")
                        ).map(async (link) => {
                            const href = link.getAttribute("href");
                            if (!href) return "";
                            const cssUrl = absoluteUrl(baseUrl, href);
                            return await fetchText(cssUrl);
                        })
                    );
                    doc.querySelectorAll("link[rel='stylesheet']").forEach(
                        (l) => l.remove()
                    );

                    // Inline external JS
                    const jsContents = await Promise.all(
                        Array.from(doc.querySelectorAll("script[src]")).map(
                            async (script) => {
                                const src = script.getAttribute("src");
                                if (!src) return "";
                                const jsUrl = absoluteUrl(baseUrl, src);
                                return await fetchText(jsUrl);
                            }
                        )
                    );
                    doc.querySelectorAll("script[src]").forEach((s) =>
                        s.remove()
                    );

                    // Inline <style> and <script> tags
                    const inlineStyles = Array.from(
                        doc.querySelectorAll("style")
                    )
                        .map((s) => s.textContent || "")
                        .join("\n");
                    doc.querySelectorAll("style").forEach((s) => s.remove());

                    const inlineScripts = Array.from(
                        doc.querySelectorAll("script:not([src])")
                    )
                        .map((s) => s.textContent || "")
                        .join("\n");
                    doc.querySelectorAll("script:not([src])").forEach((s) =>
                        s.remove()
                    );

                    // Create Shadow DOM
                    if (containerRef.current) {
                        containerRef.current.innerHTML = ""; // Clear previous content
                        const shadowRoot = containerRef.current.attachShadow({
                            mode: "open",
                        });

                        // Append combined CSS
                        const styleTag = document.createElement("style");
                        styleTag.textContent =
                            cssContents.join("\n") + "\n" + inlineStyles;
                        shadowRoot.appendChild(styleTag);

                        // Append body HTML
                        const contentWrapper = document.createElement("div");
                        contentWrapper.innerHTML = doc.body.innerHTML;
                        shadowRoot.appendChild(contentWrapper);

                        // Intercept <a href="/dweb-open-as/..."> links
                        shadowRoot.addEventListener("click", (e) => {
                            const event = e as MouseEvent;
                            const anchor = (
                                event.target as HTMLElement
                            ).closest("a");
                            if (anchor instanceof HTMLAnchorElement) {
                                const href = anchor.getAttribute("href");
                                if (href?.startsWith("/dweb-open-as/")) {
                                    event.preventDefault();
                                    const xornameFromHref = href
                                        .split("/")
                                        .pop();
                                    if (xornameFromHref) {
                                        const newUrl = new URL(
                                            window.location.href
                                        );
                                        newUrl.searchParams.set(
                                            "xorname",
                                            xornameFromHref
                                        );
                                        window.location.href =
                                            newUrl.toString();
                                    }
                                }
                            }
                        });

                        // Append combined JS
                        const scriptTag = document.createElement("script");
                        scriptTag.textContent =
                            jsContents.join("\n") + "\n" + inlineScripts;
                        shadowRoot.appendChild(scriptTag);
                    }
                } catch (err) {
                    console.error(err);
                    setError("Failed to load content.");
                } finally {
                    setLoading(false);
                }
            }
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="flex items-center px-1 py-[3px] bg-neutral-800">
                <img src={headerLogo} alt="logo" className="h-8 mr-3" />
                <div className="flex flex-1 items-center">
                    <Input
                        value={xorname}
                        onChange={(e) => setXorname(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                        }}
                        placeholder="Enter dweb path"
                        className="bg-white rounded-l-md !rounded-r-none flex-1"
                    />
                    <Button
                        onClick={handleSearch}
                        variant="secondary"
                        className="rounded-none rounded-r-md"
                        title="Search"
                    >
                        <Search className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 flex flex-col overflow-auto relative">
                {error && <div className="text-red-600">{error}</div>}
                {loading && <div className="spinner"></div>}
                {!error && <div ref={containerRef} className="w-full h-full" />}
            </div>
        </div>
    );
}

const rootEl = document.getElementById("root");
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<DWebBrowser />);
} else {
    console.error("Root element not found.");
}
