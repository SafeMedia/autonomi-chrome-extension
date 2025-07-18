import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./tailwind.css";

function Viewer() {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(window.location.search);

    const xorname = params.get("xorname");
    const ext = params.get("ext")?.toLowerCase();

    useEffect(() => {
        if (!xorname) {
            setError("Missing file reference.");
            return;
        }

        chrome.runtime.sendMessage(
            {
                action: "triggerSafeBoxClientDownloadDataUrl",
                xorname,
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    setError(
                        "Chrome runtime error: " +
                            chrome.runtime.lastError.message
                    );
                    return;
                }

                if (response?.success && response?.url) {
                    const url = response.url;

                    // if url is a base64 data URL, convert to Blob URL
                    if (url.startsWith("data:")) {
                        try {
                            // extract base64 string
                            const base64Index = url.indexOf("base64,");
                            if (base64Index === -1)
                                throw new Error("Invalid base64 data URL");

                            const mimeType = url.substring(5, base64Index - 1);
                            const base64Data = url.substring(base64Index + 7);

                            // decode base64 to binary
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(
                                byteCharacters.length
                            );
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);

                            // create blob and blob URL
                            const blob = new Blob([byteArray], {
                                type: mimeType,
                            });
                            const blobUrl = URL.createObjectURL(blob);

                            setFileUrl(blobUrl);
                        } catch (e) {
                            setError("Failed to process base64 file: " + e);
                        }
                    } else {
                        // normal URL, just use it
                        setFileUrl(url);
                    }
                } else {
                    setError("Failed to load file.");
                }
            }
        );

        // cleanup blob URL on unmount or xorname change
        return () => {
            if (fileUrl && fileUrl.startsWith("blob:")) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [xorname]);

    if (error) {
        return <div className="p-4 text-red-600">{error}</div>;
    }

    if (!fileUrl) {
        return <div className="p-4">Loading...</div>;
    }

    const commonStyle = {
        width: "100%",
        height: "100vh",
        border: "none",
    } as const;

    if (ext === "pdf") {
        return (
            <embed src={fileUrl} type="application/pdf" style={commonStyle} />
        );
    }

    if (["mp4", "webm", "ogg"].includes(ext || "")) {
        return <video src={fileUrl} controls style={commonStyle} />;
    }

    if (["mp3", "wav", "ogg"].includes(ext || "")) {
        return <audio src={fileUrl} controls style={{ width: "100%" }} />;
    }

    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) {
        return <img src={fileUrl} alt="Media" style={commonStyle} />;
    }

    return (
        <div className="p-4">
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
            >
                Download file
            </a>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Viewer />);
