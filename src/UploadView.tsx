"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FolderSearch, Upload, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const STORAGE_KEY = "connectionType";
const CHUNK_SIZE = 1024 * 1024; // 1MB

export default function UploadView({ onBack }: { onBack: () => void }) {
    const [fileName, setFileName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState<"local" | "endpoints" | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        chrome.storage.local.get([STORAGE_KEY], (res) => {
            if (
                res[STORAGE_KEY] === "local" ||
                res[STORAGE_KEY] === "endpoints"
            ) {
                setMode(res[STORAGE_KEY]);
            }
        });
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setFileName(selected.name);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        if (!chrome?.runtime?.sendMessage) {
            toast.error("Chrome messaging API is not available.");
            return;
        }

        try {
            setUploading(true);
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const uint8Array = new Uint8Array(arrayBuffer);
                const totalChunks = Math.ceil(uint8Array.length / CHUNK_SIZE);

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, uint8Array.length);
                    const chunk = uint8Array.slice(start, end);

                    chrome.runtime.sendMessage(
                        {
                            action: "triggerSafeBoxClientUploadChunk",
                            fileChunk: {
                                name: file.name,
                                mime_type: file.type,
                                chunkIndex: i,
                                totalChunks,
                                data: Array.from(chunk),
                            },
                        },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                toast.error("Extension not responding.");
                                setUploading(false);
                                return;
                            }

                            if (response?.success) {
                                if (i === totalChunks - 1) {
                                    toast.success("Upload started", {
                                        description:
                                            "Upload request received by client, please wait.",
                                    });
                                    setUploading(false);
                                }
                            } else {
                                toast.error("Error", {
                                    description:
                                        response?.error ?? "Unknown error",
                                });
                                setUploading(false);
                            }
                        }
                    );
                }
            };

            reader.readAsArrayBuffer(file);
        } catch (err) {
            toast.error("Upload failed", {
                description: (err as Error).message,
            });
            setUploading(false);
        }
    };

    return (
        <div className="p-4 w-[300px] h-[350px] flex flex-col space-y-2 overflow-hidden">
            <div className="flex items-center">
                <Button
                    variant="outline"
                    className="mr-2"
                    onClick={onBack}
                    title="Back"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold">
                    Upload
                </h1>
            </div>

            <div className="flex items-center gap-2">
                <hr className="flex-grow border-t" />
                <span className="text-xs text-muted-foreground">
                    Upload File
                </span>
                <hr className="flex-grow border-t" />
            </div>

            {mode === "local" ? (
                <div className="space-y-2">
                    <div className="flex">
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            title="Select File"
                            className="rounded-r-none"
                            disabled={uploading}
                        >
                            <FolderSearch className="w-4 h-4 mr-2" />
                            Browse
                        </Button>
                        <Input
                            value={fileName}
                            readOnly
                            placeholder="No file selected"
                            className="rounded-l-none"
                            disabled={uploading}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload"}
                    </Button>
                </div>
            ) : mode === "endpoints" ? (
                <Card>
                    <CardContent className="p-4 text-sm flex items-start gap-2 text-muted-foreground">
                        <Info className="w-4 h-4 mt-0.5 text-blue-500" />
                        <span>
                            Uploading is only available via the{" "}
                            <strong>local client</strong>. You can configure
                            this in the settings panel.
                        </span>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
