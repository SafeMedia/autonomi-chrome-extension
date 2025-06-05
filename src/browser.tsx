import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import headerLogo from "../public/images/header-light.png";
import "./tailwind.css";

// Viewers
import VideoViewer from "./viewers/video";
import AudioViewer from "./viewers/audio";
import ImageViewer from "./viewers/image";
import DocumentViewer from "./viewers/document";

function isValidXorname(input: string): boolean {
    const regex = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;
    return regex.test(input) && !input.includes("..");
}

function getFilenameFromXorname(xor: string, mimeType: string): string {
    const parts = xor.split("/");
    const last = parts[parts.length - 1];
    const ext = mimeType.split("/")[1] || "bin";
    return last.includes(".") ? last : `${last}.${ext}`;
}

function BrowserApp() {
    const [fileBlob, setFileBlob] = useState<Blob | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [mimeType, setMimeType] = useState("");

    const [xorname, setXorname] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get("address") || "";
    });

    useEffect(() => {
        if (xorname) {
            handleSearch(); // automatically trigger search if pre-filled
        }
    }, []);

    async function handleSearch() {
        setError("");
        setFileBlob(null);
        setMimeType("");
        setLoading(true);

        if (!isValidXorname(xorname)) {
            setLoading(false);
            setError("Invalid xorname path.");
            return;
        }

        chrome.storage.local.get(
            ["connectionType", "localPort"],
            async (res) => {
                const connectionType = res.connectionType || "local";
                const port = res.localPort || "8080";

                if (connectionType === "local") {
                    try {
                        const response = await fetch(
                            `http://localhost:${port}/${xorname}`
                        );
                        if (!response.ok) throw new Error("Fetch failed");

                        const blob = await response.blob();
                        setMimeType(blob.type);
                        setFileBlob(blob);
                    } catch (err) {
                        setError("Failed to fetch from local client.");
                    } finally {
                        setLoading(false);
                    }
                } else if (connectionType === "endpoints") {
                    setError(
                        "Endpoint server mode not supported yet, set local client mode in extension settings."
                    );
                    setLoading(false);
                } else {
                    // TODO re-implement download for local mode
                    // Fallback to WebSocket request via extension message
                    chrome.runtime.sendMessage(
                        { action: "triggerSafeBoxClientDownload", xorname },
                        async (response) => {
                            setLoading(false);
                            if (response?.success && response.dataUrl) {
                                try {
                                    const res = await fetch(response.dataUrl);
                                    const blob = await res.blob();
                                    setMimeType(blob.type);
                                    setFileBlob(blob);
                                } catch {
                                    setError("Failed to load file.");
                                }
                            } else {
                                setError(
                                    response?.error || "Error fetching file."
                                );
                            }
                        }
                    );
                }
            }
        );
    }

    function handleDownload() {
        if (!fileBlob) return;

        const url = URL.createObjectURL(fileBlob);
        const filename = getFilenameFromXorname(xorname, fileBlob.type);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
    }

    // Render viewer based on mime type
    function renderViewer() {
        if (!fileBlob) {
            return null;
        } else if (mimeType.startsWith("video/")) {
            return <VideoViewer blob={fileBlob} />;
        } else if (mimeType.startsWith("audio/")) {
            return <AudioViewer blob={fileBlob} />;
        } else if (mimeType.startsWith("image/")) {
            return <ImageViewer blob={fileBlob} />;
        } else {
            return <DocumentViewer blob={fileBlob} />;
        }
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center px-1 py-[3px] bg-neutral-800">
                <img src={headerLogo} alt="logo" className="h-8 mr-3" />
                <div className="flex flex-1 items-center">
                    <Input
                        value={xorname}
                        onChange={(e) => setXorname(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                        placeholder="Enter Autonomi path (64hex/filename)"
                        className="bg-white rounded-l-md !rounded-r-none flex-1"
                    />
                    <div className="flex items-center space-x-1">
                        <Button
                            onClick={handleSearch}
                            variant="secondary"
                            className="rounded-none rounded-r-md"
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={!fileBlob}
                            onClick={handleDownload}
                            className="rounded-md px-2"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 flex items-center justify-center bg-black text-white">
                {error && <div className="text-red-600">{error}</div>}
                {loading && <div className="spinner"></div>}
                {!loading && !error && fileBlob && renderViewer()}
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<BrowserApp />);
