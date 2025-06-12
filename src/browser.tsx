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
        return params.get("xorname") || "";
    });

    useEffect(() => {
        if (xorname) {
            handleSearch();
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

        try {
            chrome.storage.local.get(
                ["connectionType", "localPort"],
                async (res) => {
                    const connectionType = res.connectionType || "local";

                    if (
                        connectionType === "local" ||
                        connectionType === "endpoints"
                    ) {
                        chrome.runtime.sendMessage(
                            { action: "triggerSafeBoxClientDownload", xorname },
                            async (response) => {
                                setLoading(false);

                                if (response?.success && response.base64) {
                                    try {
                                        const binary = atob(response.base64);
                                        const len = binary.length;
                                        const bytes = new Uint8Array(len);
                                        for (let i = 0; i < len; i++) {
                                            bytes[i] = binary.charCodeAt(i);
                                        }

                                        const mimeType =
                                            response.mimeType ||
                                            "application/octet-stream";
                                        const blob = new Blob([bytes], {
                                            type: mimeType,
                                        });

                                        setMimeType(mimeType);
                                        setFileBlob(blob);
                                    } catch (err) {
                                        console.error(
                                            "Base64 decoding error:",
                                            err
                                        );
                                        setError(
                                            "File decoding failed. Invalid data or corrupted response."
                                        );
                                    }
                                } else {
                                    setError(
                                        response?.error ??
                                            (response?.success === false
                                                ? "Failed to fetch file from background script."
                                                : "Unknown error fetching file.")
                                    );
                                }
                            }
                        );
                    } else {
                        setLoading(false);
                        setError("No valid connection mode selected.");
                    }
                }
            );
        } catch (err) {
            console.error(
                "Unexpected error accessing storage or messaging:",
                err
            );
            setLoading(false);
            setError("Unexpected error accessing local storage or messaging.");
        }
    }

    function handleDownload() {
        if (!fileBlob) return;

        const url = URL.createObjectURL(fileBlob);
        const filename = getFilenameFromXorname(xorname, fileBlob.type);

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }

    function renderViewer() {
        if (!fileBlob) return null;

        if (mimeType.startsWith("video/")) {
            return <VideoViewer blob={fileBlob} />;
        } else if (mimeType.startsWith("audio/")) {
            return <AudioViewer blob={fileBlob} />;
        } else if (mimeType.startsWith("image/")) {
            return <ImageViewer blob={fileBlob} />;
        } else if (
            mimeType.startsWith("text/") ||
            mimeType === "application/pdf"
        ) {
            return <DocumentViewer blob={fileBlob} />;
        } else {
            return (
                <div className="text-white">
                    Unsupported file type: {mimeType}
                </div>
            );
        }
    }

    return (
        <div className="h-screen flex flex-col">
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
                            title="Search"
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

            <div className="flex-1 flex items-center justify-center bg-black text-white p-4 overflow-auto">
                {error && <div className="text-red-600">{error}</div>}
                {loading && <div className="spinner"></div>}
                {!loading && !error && fileBlob && renderViewer()}
            </div>
        </div>
    );
}

const rootEl = document.getElementById("root");
if (rootEl) {
    ReactDOM.createRoot(rootEl).render(<BrowserApp />);
} else {
    console.error("Root element not found.");
}
