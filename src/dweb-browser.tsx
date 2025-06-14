import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import headerLogo from "../public/images/header-light.png";
import "./tailwind.css";

function isValidXorname(_input: string): boolean {
    return true;
}

function DWebBrowser() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [iframeLoading, setIframeLoading] = useState(false);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);

    const [xorname, setXorname] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("xorname") || "";
    });

    useEffect(() => {
        if (xorname) {
            handleSearch();
        }
    }, []);

    async function handleSearch() {
        setError("");
        setLoading(true);
        setIframeUrl(null); // clear old iframe

        if (!isValidXorname(xorname)) {
            setLoading(false);
            setError("Invalid dweb path.");
            return;
        }

        try {
            chrome.storage.local.get(["connectionType", "localPort"], (res) => {
                const connectionType = res.connectionType || "local";
                const localPort = "8080";

                if (
                    connectionType === "local" ||
                    connectionType === "endpoints"
                ) {
                    console.log("dweb opening: ", xorname);
                    const url = `http://127.0.0.1:${localPort}/dweb-open/v/${xorname}`;
                    setIframeUrl(url);
                    setIframeLoading(true);
                    setLoading(false);
                } else {
                    console.log("starting 2");
                    setLoading(false);
                    setError("No valid connection mode selected.");
                }
            });
        } catch (err) {
            console.error("Error:", err);
            setLoading(false);
            setError("Unexpected error.");
        }
    }

    function renderViewer() {
        if (!iframeUrl) return null;

        return (
            <iframe
                src={iframeUrl}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                className="w-full h-full border-none"
                onLoad={() => {
                    console.log("Iframe loaded:", iframeUrl);
                    setIframeLoading(false);
                }}
                onError={() => {
                    console.error("Iframe failed to load:", iframeUrl);
                    setIframeLoading(false);
                    setError("Failed to load content.");
                }}
            />
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header with search input */}
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
                    <div className="flex items-center space-x-1">
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
            </div>

            {/* Viewer area */}
            <div className="flex-1 flex items-center justify-center bg-black text-white p-4 overflow-auto">
                {error && <div className="text-red-600">{error}</div>}
                {(loading || iframeLoading) && <div className="spinner"></div>}
                {!loading && !iframeLoading && !error && renderViewer()}
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
