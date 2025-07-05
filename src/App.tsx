import { useEffect, useState } from "react";
import { Settings, Globe, Upload, Wallet } from "lucide-react";
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

const STORAGE_KEY = "connectionType";
const URLS_KEY = "urls";
const LOCAL_PORT_KEY = "localPort";

function App() {
    const [view, setView] = useState<"main" | "settings" | "upload">("main");
    const [localPort, setLocalPort] = useState("");
    const [antTPAddress, setAntTPAddress] = useState("");
    const [dWebAddress, setDWebAddress] = useState("");
    const [selectedOption, setSelectedOption] = useState("");

    const [antTPPort, setAntTPPort] = useState(8082);
    const [dWebPort, setDWebPort] = useState(8083);

    const [_urls, setUrls] = useState<string[]>([]); // endpoint urls use if mode is endpoints

    const isValidXorname = (input: string) => {
        const regex = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;
        return regex.test(input) && !input.includes("..");
    };

    useEffect(() => {
        chrome.storage.local.get("connectionType", (result) => {
            console.log(result);
        });

        // initial fetch
        chrome.storage.local.get(
            [STORAGE_KEY, URLS_KEY, LOCAL_PORT_KEY],
            (res) => {
                if (
                    res[STORAGE_KEY] === "local" ||
                    res[STORAGE_KEY] === "endpoints"
                ) {
                    setSelectedOption(res[STORAGE_KEY]);
                } else {
                    setSelectedOption("endpoints");
                    chrome.storage.local.set(
                        { connectionType: "endpoints" },
                        () => {
                            console.log(
                                "connectionType set to endpoints by default"
                            );
                        }
                    );
                }

                if (Array.isArray(res[URLS_KEY])) {
                    setUrls(res[URLS_KEY]);
                }

                if (res[LOCAL_PORT_KEY]) {
                    setLocalPort(String(res[LOCAL_PORT_KEY]));
                } else {
                    setLocalPort("8084");
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
                        : "endpoints"
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
                setLocalPort(newPort ? String(newPort) : "8084");
            }
        }

        chrome.storage.onChanged.addListener(handleStorageChange);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    // update anttp & dweb ports if mode is local
    useEffect(() => {
        if (selectedOption === "local" && localPort) {
            const baseUrl = `http://127.0.0.1:${localPort}`;

            // Fetch AntTP port
            fetch(`${baseUrl}/getAntTPPort`)
                .then((res) => res.json())
                .then((data) => {
                    const port = data.port;
                    setAntTPPort(port);
                })
                .catch((err) => {
                    console.error("Error fetching AntTP port:", err);
                    setAntTPAddress(""); // fallback or clear
                });

            // Fetch DWeb port
            fetch(`${baseUrl}/getDWebPort`)
                .then((res) => res.json())
                .then((data) => {
                    const port = data.port;
                    setDWebPort(port);
                })
                .catch((err) => {
                    console.error("Error fetching DWeb port:", err);
                    setDWebAddress("");
                });
        }
    }, [selectedOption, localPort]);

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
                        continue;
                    }
                }

                // None worked
                resolve(null);
            });
        });
    }

    const handleOpenAntTPAddress = async () => {
        if (selectedOption === "local") {
            const path = antTPAddress.trim().replace(/^\/+/, "");
            const trimmed = path.trim();

            const baseUrl = `http://127.0.0.1:${antTPPort}/${trimmed}`;
            window.open(baseUrl, "_blank");
        } else {
            const path = dWebAddress.trim().replace(/^\/+/, "");
            const trimmed = path.trim();

            if (!isValidXorname(trimmed)) {
                toast.error("Invalid AntTP Autonomi address");
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

                setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
            } catch (error: any) {
                toast.error("Failed to open address from remote endpoint");
                console.error(error);
            }
        }
    };

    const handleOpenDWebAddress = async () => {
        if (selectedOption === "local") {
            const path = dWebAddress.trim().replace(/^\/+/, "");
            const trimmed = path.trim();

            const baseUrl = `http://127.0.0.1:${dWebPort}/dweb-open/v/${trimmed}`;
            window.open(baseUrl, "_blank");
        } else {
            const path = dWebAddress.trim().replace(/^\/+/, "");
            const trimmed = path.trim();

            if (!isValidXorname(trimmed)) {
                toast.error("Invalid DWeb Autonomi address");
                return;
            }

            const remoteEndpoint = await getBestRemoteEndpoint();

            if (!remoteEndpoint) {
                toast.error("No available endpoint URLs");
                return;
            }

            try {
                const response = await fetch(
                    `${remoteEndpoint}/dweb-open/v/${trimmed}`
                );
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);

                window.open(objectUrl, "_blank");

                setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
            } catch (error: any) {
                toast.error("Failed to open address from remote endpoint");
                console.error(error);
            }
        }
    };

    if (view === "settings") {
        return (
            <SettingsView
                onBack={() => {
                    chrome.storage.local.get("connectionType", (result) => {
                        console.log("THE RESULT IS: ", result);
                    });

                    setView("main");
                }}
            />
        );
    } else if (view === "upload") {
        return <UploadView onBack={() => setView("main")} />;
    }

    return (
        <div className="p-4 w-[300px] h-[370px] flex flex-col justify-between">
            <div>
                {/* Open ANTTP Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <hr className="flex-grow border-t" />
                        <span className="text-xs text-muted-foreground">
                            AntTP
                        </span>
                        <hr className="flex-grow border-t" />
                    </div>

                    <Input
                        placeholder="Enter AntTP address"
                        value={antTPAddress}
                        onChange={(e) => setAntTPAddress(e.target.value)}
                    />
                    <Button className="w-full" onClick={handleOpenAntTPAddress}>
                        Browse AntTP
                    </Button>
                </div>

                {/* Open DWeb Section */}
                {selectedOption === "local" ? (
                    <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2">
                            <hr className="flex-grow border-t" />
                            <span className="text-xs text-muted-foreground">
                                DWeb
                            </span>
                            <hr className="flex-grow border-t" />
                        </div>

                        <Input
                            placeholder="Enter DWeb address"
                            value={dWebAddress}
                            onChange={(e) => setDWebAddress(e.target.value)}
                        />
                        <Button
                            className="w-full"
                            onClick={handleOpenDWebAddress}
                        >
                            Browse DWeb
                        </Button>
                    </div>
                ) : (
                    // Empty div with same height to preserve spacing
                    <div className="space-y-2" style={{ height: "116px" }} />
                )}
            </div>

            {/* Settings Section */}
            <div className="space-y-2 mt-4">
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
                                onClick={() => {
                                    setView("settings");
                                }}
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
