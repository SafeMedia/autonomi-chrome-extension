import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./tailwind.css"; // Ensure Tailwind is set up
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const UploadView = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadId, setUploadId] = useState<string | null>(null);
    const [chunkIndex, setChunkIndex] = useState(0);
    const [_totalChunks, setTotalChunks] = useState(0);
    const [status, setStatus] = useState<string>("");
    const [errors, setErrors] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!uploadId) return;

        const onMessage = (message: any) => {
            if (
                message.action === "uploadComplete" &&
                message.upload_id === uploadId
            ) {
                setStatus(`${message.xorname}`);
                setErrors([]);
                setIsUploading(false);

                // Clear selected file and input
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }

                chrome.runtime.onMessage.removeListener(onMessage);
            } else if (
                message.action === "uploadError" &&
                message.upload_id === uploadId
            ) {
                setErrors((prev) => [...prev, `❌ ${message.error}`]);
                setIsUploading(false);
            }
        };

        chrome.runtime.onMessage.addListener(onMessage);
        return () => chrome.runtime.onMessage.removeListener(onMessage);
    }, [uploadId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        setStatus("");
        setErrors([]);
        setChunkIndex(0);
        setUploadId(null);
    };

    const uint8ArrayToBase64 = (u8Arr: Uint8Array) => {
        let result = "";
        const CHUNK_SIZE = 0x8000;
        for (let i = 0; i < u8Arr.length; i += CHUNK_SIZE) {
            const chunk = u8Arr.subarray(i, i + CHUNK_SIZE);
            let chunkStr = "";
            for (let j = 0; j < chunk.length; j++) {
                chunkStr += String.fromCharCode(chunk[j]);
            }
            result += chunkStr;
        }
        return btoa(result);
    };

    const readNextChunk = (
        file: File,
        index: number,
        _total: number,
        _id: string,
        reader: FileReader
    ) => {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);
        reader.readAsArrayBuffer(blob);
    };

    const sendChunk = (
        chunk: Uint8Array,
        index: number,
        total: number,
        file: File,
        id: string
    ) => {
        return new Promise<void>((resolve, reject) => {
            const base64Chunk = uint8ArrayToBase64(chunk);

            chrome.runtime.sendMessage(
                {
                    action: "triggerSafeBoxClientUploadChunk",
                    fileChunk: {
                        name: file.name,
                        mime_type: file.type,
                        chunkIndex: index,
                        totalChunks: total,
                        data: base64Chunk,
                        upload_id: id,
                    },
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (index === 0) {
                        if (response?.success) {
                            setStatus(
                                `📤 Uploaded chunk ${index + 1}/${total}`
                            );
                            resolve();
                        } else {
                            reject(
                                new Error(response?.error || "Unknown error")
                            );
                        }
                    } else {
                        setStatus(`📤 Uploaded chunk ${index + 1}/${total}`);
                        resolve();
                    }
                }
            );
        });
    };

    const handleUpload = () => {
        if (!selectedFile || isUploading) return;

        setIsUploading(true);
        const file = selectedFile;
        const total = Math.ceil(file.size / CHUNK_SIZE);
        const id = `${file.name}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;
        const reader = new FileReader();

        setTotalChunks(total);
        setUploadId(id);
        setChunkIndex(0);
        setStatus("🔄 Starting upload...");

        reader.onload = async () => {
            const buffer = reader.result as ArrayBuffer;
            const chunk = new Uint8Array(buffer);
            try {
                await sendChunk(chunk, chunkIndex, total, file, id);
            } catch (err: any) {
                setStatus(
                    `❌ Error on chunk ${chunkIndex + 1}: ${err.message}`
                );
                setIsUploading(false);
                return;
            }

            const nextIndex = chunkIndex + 1;
            setChunkIndex(nextIndex);
            if (nextIndex < total) {
                readNextChunk(file, nextIndex, total, id, reader);
            } else {
                setStatus("📦 Final chunk sent. Waiting for confirmation...");
            }
        };

        reader.onerror = () => {
            setStatus(`❌ File read error: ${reader.error?.message}`);
            setIsUploading(false);
        };

        readNextChunk(file, 0, total, id, reader);
    };

    return (
        <div className="min-h-screen flex items-start justify-center bg-gray-100 p-6">
            <div className="bg-white rounded-2xl shadow-md p-6 w-full md:w-4/5 max-w-none">
                <h1 className="text-2xl font-semibold mb-4">
                    Autonomi File Upload
                </h1>

                <Input
                    type="file"
                    onChange={handleFileChange}
                    className="mb-2 w-full md:w-[20%]"
                    ref={fileInputRef}
                    disabled={isUploading}
                />
                <div className="text-sm text-gray-500 mb-4">
                    {selectedFile ? selectedFile.name : "No file selected"}
                </div>

                <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className={`py-2 rounded-lg text-white text-base font-medium transition ${
                        selectedFile && !isUploading
                            ? "bg-blue-700 hover:bg-blue-800"
                            : "bg-blue-900 cursor-not-allowed"
                    }`}
                >
                    {isUploading ? "Uploading..." : "Upload"}
                </Button>

                {errors.length > 0 && (
                    <div className="mt-4 text-red-600 text-sm space-y-1">
                        {errors.map((err, i) => (
                            <div key={i}>{err}</div>
                        ))}
                    </div>
                )}

                {status && (
                    <div
                        className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 whitespace-pre-wrap overflow-y-auto"
                        style={{ height: "calc(100vh - 260px - 1.5rem)" }}
                    >
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
};

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<UploadView />);
}
