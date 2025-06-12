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
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState<"local" | "endpoints" | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        chrome.storage.local.get([STORAGE_KEY], (res) => {
            const connection = res[STORAGE_KEY];
            if (connection === "local" || connection === "endpoints") {
                setMode(connection);
            }
        });
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList && fileList.length > 0) {
            const fileArray = Array.from(fileList);
            setFiles(fileArray);
        }
    };

    const uploadFile = async (file: File): Promise<string | null> => {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const totalChunks = Math.ceil(uint8Array.length / CHUNK_SIZE);
        const relativePath = (file as any).webkitRelativePath || file.name;

        let xorname: string | null = null;

        for (let index = 0; index < totalChunks; index++) {
            const start = index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, uint8Array.length);
            const chunk = uint8Array.slice(start, end);

            await new Promise<void>((resolve) => {
                const message = {
                    action: "triggerSafeBoxClientUploadChunk",
                    fileChunk: {
                        name: relativePath,
                        mime_type: file.type || "application/octet-stream",
                        chunkIndex: index,
                        totalChunks,
                        data: chunk.buffer,
                    },
                };

                // Only wait for a response on the **last** chunk
                if (index === totalChunks - 1) {
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            toast.error("Extension not responding.");
                            resolve();
                            return;
                        }

                        if (!response?.success) {
                            toast.error(`Failed to upload ${relativePath}`);
                        } else if (response.xorname) {
                            xorname = response.xorname;
                        }

                        resolve();
                    });
                } else {
                    // Don't wait for response, just send
                    chrome.runtime.sendMessage(message);
                    resolve();
                }
            });
        }

        return xorname;
    };

    const handleUpload = async () => {
        if (!files.length || uploading) return;

        setUploading(true);

        try {
            const xornames: string[] = [];

            for (const file of files) {
                const xorname = await uploadFile(file);
                if (xorname) xornames.push(xorname);
            }

            toast.success("Upload started", {
                description: "Upload request received by client. Please wait.",
            });

            if (files.length === 1 && xornames.length === 1) {
                toast.success("Upload complete", {
                    description: `XOR name: ${xornames[0]}`,
                });
            }
        } catch (err) {
            toast.error("Upload failed", {
                description: (err as Error).message || "Unexpected error",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 w-[300px] h-[400px] flex flex-col space-y-2 overflow-hidden">
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
                    Upload Files
                </span>
                <hr className="flex-grow border-t" />
            </div>

            {mode === "local" ? (
                <div className="space-y-2">
                    <div className="flex">
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            title="Select Files or Folder"
                            className="rounded-r-none"
                            disabled={uploading}
                        >
                            <FolderSearch className="w-4 h-4 mr-2" />
                            Browse
                        </Button>
                        <Input
                            value={
                                files.length === 0
                                    ? ""
                                    : files.length === 1
                                    ? files[0].name
                                    : `${files.length} files selected`
                            }
                            readOnly
                            placeholder="No file/folder selected"
                            className="rounded-l-none"
                            disabled={uploading}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple={true}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleUpload}
                        disabled={!files.length || uploading}
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
