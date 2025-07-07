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
import { isValidXorname } from "./utils";

const STORAGE_KEY = "connectionType";
const URLS_KEY = "endpointUrls";
const LOCAL_PORT_KEY = "localPort";

function cleanAddressInput(value: string): string {
    return value.trim().replace(/^\/+/, "");
}

function App() {
    const [view, setView] = useState<"main" | "settings" | "upload">("main");
    const [localPort, setLocalPort] = useState("");
    const [antTPAddress, setAntTPAddress] = useState("");
    const [dWebAddress, setDWebAddress] = useState("");
    const [selectedOption, setSelectedOption] = useState("");

    const [antTPPort, setAntTPPort] = useState(8082);
    const [dWebPort, setDWebPort] = useState(8083);
    const [urls, setUrls] = useState<string[]>([]);

    useEffect(() => {
        chrome.storage.local.get(
            [STORAGE_KEY, URLS_KEY, LOCAL_PORT_KEY],
            (res) => {
                const connectionType = res[STORAGE_KEY];
                if (
                    connectionType === "local" ||
                    connectionType === "endpoints"
                ) {
                    setSelectedOption(connectionType);
                } else {
                    setSelectedOption("endpoints");
                    chrome.storage.local.set({ [STORAGE_KEY]: "endpoints" });
                }

                if (Array.isArray(res[URLS_KEY])) {
                    setUrls(res[URLS_KEY]);
                }

                setLocalPort(
                    res[LOCAL_PORT_KEY] ? String(res[LOCAL_PORT_KEY]) : "8084"
                );
            }
        );

        function handleStorageChange(changes: any) {
            if (changes[STORAGE_KEY]) {
                const newValue = changes[STORAGE_KEY].newValue;
                setSelectedOption(
                    newValue === "endpoints" || newValue === "local"
                        ? newValue
                        : "endpoints"
                );
            }

            if (
                changes[URLS_KEY] &&
                Array.isArray(changes[URLS_KEY].newValue)
            ) {
                setUrls(changes[URLS_KEY].newValue);
            }

            if (changes[LOCAL_PORT_KEY]) {
                setLocalPort(changes[LOCAL_PORT_KEY].newValue || "8084");
            }
        }

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () =>
            chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    useEffect(() => {
        if (selectedOption === "local" && localPort) {
            const baseUrl = `http://127.0.0.1:${localPort}`;

            fetch(`${baseUrl}/getAntTPPort`)
                .then((res) => res.json())
                .then((data) => setAntTPPort(data.port))
                .catch((err) => {
                    console.error("Error fetching AntTP port:", err);
                    setAntTPAddress("");
                });

            fetch(`${baseUrl}/getDWebPort`)
                .then((res) => res.json())
                .then((data) => setDWebPort(data.port))
                .catch((err) => {
                    console.error("Error fetching DWeb port:", err);
                    setDWebAddress("");
                });
        }
    }, [selectedOption, localPort]);

    async function getBestRemoteDomain(): Promise<string | null> {
        console.log("urls:", urls);
        if (!urls || urls.length === 0) return null;

        for (const baseDomain of urls) {
            const httpsUrl = `https://anttp.${baseDomain}`;

            try {
                const response = await fetch(`${httpsUrl}/`, {
                    method: "HEAD",
                    mode: "cors",
                });

                if (response.ok || response.status === 404) {
                    return httpsUrl;
                }
            } catch (err) {
                console.warn(`Failed to reach ${httpsUrl}`, err);
                continue;
            }
        }

        return null;
    }

    const handleOpenAntTPAddress = async () => {
        const trimmed = cleanAddressInput(antTPAddress);

        if (selectedOption === "local") {
            const localUrl = `http://127.0.0.1:${antTPPort}/${trimmed}`;
            window.open(localUrl, "_blank");
        } else {
            if (!isValidXorname(trimmed)) {
                toast.error("Invalid AntTP Autonomi address");
                return;
            }

            const remoteDomain = await getBestRemoteDomain();
            if (!remoteDomain) {
                toast.error("No available endpoint URLs");
                return;
            }

            try {
                const response = await fetch(`${remoteDomain}/${trimmed}`, {
                    method: "HEAD",
                    mode: "cors",
                });
                if (!response.ok && response.status !== 404) throw new Error();

                window.open(`${remoteDomain}/${trimmed}`, "_blank");
            } catch {
                toast.error("Failed to open address from remote endpoint");
            }
        }
    };

    const handleOpenDWebAddress = async () => {
        const trimmed = cleanAddressInput(dWebAddress);

        if (selectedOption === "local") {
            const localUrl = `http://127.0.0.1:${dWebPort}/dweb-open/v/${trimmed}`;
            window.open(localUrl, "_blank");
        }
    };

    if (view === "settings") {
        return <SettingsView onBack={() => setView("main")} />;
    }

    if (view === "upload") {
        return <UploadView onBack={() => setView("main")} />;
    }

    return (
        <div className="p-4 w-[300px] h-[370px] flex flex-col justify-between">
            <div>
                {/* AntTP Section */}
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

                {/* DWeb Section */}
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
                            <Button variant="outline" onClick={() => {}}>
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
