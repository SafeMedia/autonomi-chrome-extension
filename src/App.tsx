import { useEffect, useState } from "react";
import {
    Image,
    Video,
    FileText,
    Music,
    Settings,
    Globe,
    Upload,
    Wallet,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import SettingsView from "./SettingsView";
import UploadView from "./UploadView";
import { toast } from "sonner";

const STORAGE_KEY = "connectionOption";
const URLS_KEY = "urls";
const LOCAL_PORT_KEY = "localPort";

function App() {
    const [view, setView] = useState<"main" | "settings" | "upload">("main");
    const [_localPort, setLocalPort] = useState("");
    const [nativeAddress, setNativeAddress] = useState("");
    const [selectedOption, setSelectedOption] = useState("");
    const [_urls, setUrls] = useState<string[]>([]); // endpoint urls use is mode is endpoints

    const isValidXorname = (input: string) => {
        const regex = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;
        return regex.test(input) && !input.includes("..");
    };

    useEffect(() => {
        // Initial fetch
        chrome.storage.local.get(
            [STORAGE_KEY, URLS_KEY, LOCAL_PORT_KEY],
            (res) => {
                if (
                    res[STORAGE_KEY] === "local" ||
                    res[STORAGE_KEY] === "endpoints"
                ) {
                    setSelectedOption(res[STORAGE_KEY]);
                } else {
                    setSelectedOption("local");
                }

                if (Array.isArray(res[URLS_KEY])) {
                    setUrls(res[URLS_KEY]);
                }

                if (res[LOCAL_PORT_KEY]) {
                    setLocalPort(String(res[LOCAL_PORT_KEY]));
                } else {
                    setLocalPort("8081");
                }
            }
        );

        // Listener for future changes
        function handleStorageChange(changes: any) {
            if (changes[STORAGE_KEY]) {
                const newValue = changes[STORAGE_KEY].newValue;
                setSelectedOption(
                    newValue === "endpoints" || newValue === "local"
                        ? newValue
                        : "local"
                );
            }

            if (changes[URLS_KEY]) {
                const newUrls = changes[URLS_KEY].newValue;
                if (Array.isArray(newUrls)) {
                    setUrls(newUrls);
                }
            }

            if (changes[LOCAL_PORT_KEY]) {
                const newPort = changes[LOCAL_PORT_KEY].newValue;
                setLocalPort(newPort ? String(newPort) : "8081");
            }
        }

        chrome.storage.onChanged.addListener(handleStorageChange);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    const openViewer = (type: string) => {
        window.open(`${type}.html`, "_blank");
    };

    async function getBestRemoteEndpoint(): Promise<string | null> {
        return new Promise((resolve) => {
            chrome.storage.local.get(["endpointUrls"], async (result) => {
                const urls = result.endpointUrls as string[] | undefined;
                if (!urls || urls.length === 0) {
                    resolve(null);
                    return;
                }

                for (const url of urls) {
                    try {
                        // Try fetching a health check or HEAD on root (faster)
                        const response = await fetch(`${url}/`, {
                            method: "HEAD",
                            mode: "cors",
                        });

                        if (response.ok) {
                            resolve(url);
                            return;
                        }
                    } catch (e) {
                        // console.warn(`Failed to connect to ${url}:`, e);
                        continue;
                    }
                }

                // None worked
                resolve(null);
            });
        });
    }

    const handleOpenNative = async () => {
        if (selectedOption === "local") {
            //  const port = "8080";
            const path = nativeAddress.trim().replace(/^\/+/, "");
            const trimmed = path.trim();

            // if (!isValidXorname(trimmed)) {
            //     toast.error("Invalid Autonomi address");
            //     return;
            // }

            const browserUrl = `dweb-browser.html?xorname=${encodeURIComponent(
                trimmed
            )}`;
            window.open(browserUrl, "_blank");
        } else {
            const path = nativeAddress.trim().replace(/^\/+/, "");
            const trimmed = path.trim();

            if (!isValidXorname(trimmed)) {
                toast.error("Invalid Autonomi address");
                return;
            }

            const remoteEndpoint = await getBestRemoteEndpoint();

            if (!remoteEndpoint) {
                toast.error("No available endpoint URLs");
                return;
            }

            try {
                const response = await fetch(`${remoteEndpoint}/${trimmed}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);

                window.open(objectUrl, "_blank");

                // Optional: clean up later
                setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
            } catch (error: any) {
                toast.error("Failed to load file from remote endpoint");
                console.error(error);
            }
        }
    };

    if (view === "settings") {
        return <SettingsView onBack={() => setView("main")} />;
    } else if (view === "upload") {
        return <UploadView onBack={() => setView("main")} />;
    }

    return (
        <div className="p-4 space-y-6 w-[300px] h-[350px] overflow-auto">
            {/* Media Viewers Section */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <hr className="flex-grow border-t" />
                    <span className="text-xs text-muted-foreground">
                        Media Browser
                    </span>
                    <hr className="flex-grow border-t" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {[
                        { icon: Image, label: "View Images" },
                        { icon: Video, label: "Watch Videos" },
                        { icon: FileText, label: "Read Documents" },
                        { icon: Music, label: "Listen to Audio" },
                    ].map(({ icon: Icon, label }, index) => (
                        <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full flex justify-center"
                                    onClick={() => {
                                        if (selectedOption === "local") {
                                            openViewer("browser");
                                        } else {
                                            toast.error(
                                                "Not currently supported in this mode. Use local client instead."
                                            );
                                        }
                                    }}
                                >
                                    <Icon className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{label}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>

            {/* Browsing Section */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <hr className="flex-grow border-t" />
                    <span className="text-xs text-muted-foreground">
                        Browsing
                    </span>
                    <hr className="flex-grow border-t" />
                </div>

                <Input
                    placeholder="Enter Autonomi address"
                    value={nativeAddress}
                    onChange={(e) => setNativeAddress(e.target.value)}
                />
                <Button className="w-full" onClick={handleOpenNative}>
                    Browse DWeb
                </Button>
            </div>

            {/* Settings Section */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <hr className="flex-grow border-t" />
                    <span className="text-xs text-muted-foreground">
                        Configuration
                    </span>
                    <hr className="flex-grow border-t" />
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full flex justify-center"
                                onClick={() => setView("settings")}
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Settings</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full flex justify-center"
                                onClick={() =>
                                    window.open(
                                        "https://autonomi.com",
                                        "_blank"
                                    )
                                }
                            >
                                <Globe className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Autonomi Website</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full flex justify-center"
                                onClick={() => setView("upload")}
                            >
                                <Upload className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Upload</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full flex justify-center"
                                onClick={() => {}}
                            >
                                <Wallet className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Coming Soon</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}

export default App;
