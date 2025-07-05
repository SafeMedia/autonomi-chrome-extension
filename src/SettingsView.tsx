import { useState, useEffect, useRef } from "react";
import {
    DndContext,
    closestCenter,
    MouseSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Cable, Plus, X } from "lucide-react";

const STORAGE_KEY = "connectionType";
const URLS_KEY = "endpointUrls";
const LOCAL_PORT_KEY = "localClientPort";
const TOAST_ACK_KEY = "reorderToastAcknowledged";

export default function SettingsView({ onBack }: { onBack: () => void }) {
    const [selectedOption, setSelectedOption] = useState<"endpoints" | "local">(
        "endpoints"
    );
    const [urls, setUrls] = useState<string[]>([]);
    const [newUrl, setNewUrl] = useState("");
    const [localPort, setLocalPort] = useState("");
    const [statusMap, setStatusMap] = useState<
        Record<string, "ok" | "fail" | "loading">
    >({});

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchStatuses = async (urlsToCheck: string[]) => {
        const results: Record<string, "ok" | "fail"> = {};
        await Promise.all(
            urlsToCheck.map(async (url) => {
                try {
                    const ws = new WebSocket(url);
                    return await new Promise<void>((resolve) => {
                        const cleanup = () => {
                            ws.close();
                            resolve();
                        };
                        ws.onopen = () => {
                            results[url] = "ok";
                            cleanup();
                        };
                        ws.onerror = () => {
                            results[url] = "fail";
                            cleanup();
                        };
                        setTimeout(() => {
                            results[url] = "fail";
                            cleanup();
                        }, 3000); // timeout after 3s
                    });
                } catch {
                    results[url] = "fail";
                }
            })
        );
        setStatusMap((prev) => ({
            ...prev,
            ...results,
        }));
    };

    useEffect(() => {
        chrome.storage.local.get(
            [STORAGE_KEY, URLS_KEY, LOCAL_PORT_KEY, TOAST_ACK_KEY],
            (res) => {
                const urls = Array.isArray(res[URLS_KEY]) ? res[URLS_KEY] : [];
                setUrls(urls);
                if (
                    res[STORAGE_KEY] === "local" ||
                    res[STORAGE_KEY] === "endpoints"
                ) {
                    setSelectedOption(res[STORAGE_KEY]);
                }
                setLocalPort(res[LOCAL_PORT_KEY]?.toString() || "8084");

                if (!res[TOAST_ACK_KEY]) {
                    const id = toast.info(
                        "You can reorder the priority of endpoint servers by dragging them.",
                        {
                            action: {
                                label: "I understand",
                                onClick: () => {
                                    chrome.storage.local.set({
                                        [TOAST_ACK_KEY]: true,
                                    });
                                    toast.dismiss(id);
                                },
                            },
                            duration: Infinity,
                        }
                    );
                }
            }
        );
    }, []);

    useEffect(() => {
        if (selectedOption !== "endpoints") return;

        // initial status load
        fetchStatuses(urls);

        // poll every 15 seconds
        intervalRef.current = setInterval(() => fetchStatuses(urls), 15000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [urls, selectedOption]);

    const handleOptionChange = (val: string) => {
        const option = val as "endpoints" | "local";
        setSelectedOption(option);
        chrome.storage.local.set({ [STORAGE_KEY]: option });
    };

    const isValidWebSocketUrl = (url: string) => {
        try {
            const parsed = new URL(url);
            return (
                (parsed.protocol === "ws:" || parsed.protocol === "wss:") &&
                /^[^\s]+\.[^\s]+$/.test(parsed.hostname)
            );
        } catch {
            return false;
        }
    };

    const addUrl = () => {
        const trimmed = newUrl.trim();
        if (!isValidWebSocketUrl(trimmed)) {
            toast.error("Please enter a valid ws:// or wss:// WebSocket URL.");
            return;
        }
        if (urls.includes(trimmed)) {
            toast.warning("That URL is already in your list.");
            return;
        }
        const updated = [...urls, trimmed];
        setUrls(updated);
        chrome.storage.local.set({ [URLS_KEY]: updated });
        setNewUrl("");
    };

    const deleteUrl = (index: number) => {
        const updated = urls.filter((_, i) => i !== index);
        setUrls(updated);
        chrome.storage.local.set({ [URLS_KEY]: updated });
    };

    const handleLocalPortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!/^\d*$/.test(value)) return;
        setLocalPort(value);
        const portNum = Number(value || "8084");
        if (portNum >= 1 && portNum <= 65535) {
            chrome.storage.local.set({ [LOCAL_PORT_KEY]: portNum });
        }
    };

    const sensors = useSensors(useSensor(MouseSensor));
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = urls.findIndex((url) => url === active.id);
            const newIndex = urls.findIndex((url) => url === over.id);
            const updated = arrayMove(urls, oldIndex, newIndex);
            setUrls(updated);
            chrome.storage.local.set({ [URLS_KEY]: updated });
        }
    };

    return (
        <div className="p-4 w-[300px] h-[370px] flex flex-col space-y-2 overflow-hidden">
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
                    Settings
                </h1>
            </div>

            <div className="flex items-center gap-2">
                <hr className="flex-grow border-t" />
                <span className="text-xs text-muted-foreground">Mode</span>
                <hr className="flex-grow border-t" />
            </div>

            <div className="space-y-2 flex-1 overflow-hidden">
                <Select
                    value={selectedOption}
                    onValueChange={handleOptionChange}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="endpoints">
                            Endpoint Servers
                        </SelectItem>
                        <SelectItem value="local">Local Client</SelectItem>
                    </SelectContent>
                </Select>

                {selectedOption === "endpoints" ? (
                    <>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add WebSocket URL"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={addUrl}
                                variant="outline"
                                title="Add"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="overflow-y-auto flex-1 border rounded p-2 space-y-2 max-h-[150px]">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={urls}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {urls.map((url, index) => (
                                        <UrlItemWithDelete
                                            key={url}
                                            url={url}
                                            onDelete={() => deleteUrl(index)}
                                            status={statusMap[url]}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <hr className="flex-grow border-t" />
                            <span className="text-xs text-muted-foreground">
                                WebSocket Port
                            </span>
                            <hr className="flex-grow border-t" />
                        </div>
                        <Input
                            placeholder="Enter local port (default 8084)"
                            value={localPort}
                            onChange={handleLocalPortChange}
                        />
                        <Button
                            className="w-full justify-between"
                            onClick={async () => {
                                const port = localPort.trim() || "8084";
                                const testUrl = `http://localhost:${port}/`;

                                try {
                                    await fetch(testUrl, { method: "GET" });
                                    toast.success(
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Connected to local client on port{" "}
                                            {port}
                                        </span>
                                    );
                                } catch {
                                    toast.error(
                                        <span className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                            Failed to connect to local client
                                        </span>
                                    );
                                }
                            }}
                        >
                            <span>Test local connection</span>
                            <Cable className="w-4 h-4 ml-2" />
                        </Button>
                    </>
                )}
            </div>

            <div className="pt-2 text-center">
                <span className="text-[12px] text-muted-foreground">
                    version: 0.1.1
                </span>
            </div>
        </div>
    );
}

function UrlItemWithDelete({
    url,
    onDelete,
    status,
}: {
    url: string;
    onDelete: () => void;
    status?: "ok" | "fail" | "loading";
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: url });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const statusColor =
        status === "ok"
            ? "bg-green-500"
            : status === "fail"
            ? "bg-red-500"
            : "bg-yellow-400";

    return (
        <div className="flex items-center justify-between space-x-2">
            <div
                ref={setNodeRef}
                {...attributes}
                {...listeners}
                style={style}
                className="flex items-center space-x-2 flex-1 bg-muted px-3 py-2 rounded text-sm cursor-move select-none truncate"
                title={url}
            >
                <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="truncate">{url}</span>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                title="Delete URL"
            >
                <X className="w-3 h-3" />
            </Button>
        </div>
    );
}
