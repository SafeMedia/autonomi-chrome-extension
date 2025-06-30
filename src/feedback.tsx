import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import "./tailwind.css"; // Ensure Tailwind is set up

function isValidXorname(input: string): boolean {
    const regex = /^[a-f0-9]{64}(\/[\w\-._~:@!$&'()*+,;=]+)*$/i;
    return regex.test(input) && !input.includes("..");
}

function FeedbackApp() {
    const [input, setInput] = useState("");
    const [title, setTitle] = useState("Feedback");
    const [message, setMessage] = useState("");
    const [antTPPort, setAntTPPort] = useState<number | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setTitle(decodeURIComponent(params.get("title") || "Feedback"));
        setMessage(decodeURIComponent(params.get("message") || ""));

        // fetch the AntTP port from background
        chrome.runtime.sendMessage({ action: "fetchAntTPPort" }, (response) => {
            if (chrome.runtime.lastError) {
                toast.error(
                    "Error fetching AntTP port: " +
                        chrome.runtime.lastError.message
                );
            } else if (response?.success) {
                setAntTPPort(response.antTPPort);
            } else {
                toast.error(
                    "Failed to get AntTP port: " +
                        (response?.error || "Unknown error")
                );
            }
        });
    }, []);

    const handleSearch = () => {
        if (!isValidXorname(input)) {
            toast.error("Invalid address format.");
            return;
        }

        if (!isValidXorname(input)) {
            toast.error("Invalid address format.");
            return;
        }

        const url = `http://127.0.0.1:${antTPPort}/${encodeURIComponent(
            input
        )}`;
        window.open(url, "_blank");
    };

    return (
        <div className="relative w-full h-screen font-sans bg-white text-center">
            <Toaster position="bottom-center" />
            <div className="absolute left-1/2 top-1/2 w-full max-w-[710px] -translate-x-1/2 -translate-y-1/2 px-4">
                <div className="h-[200px] leading-[200px]">
                    <h1 className="text-[168px] font-bold text-[#ff508e] uppercase m-0 p-0 leading-none">
                        404
                    </h1>
                </div>
                <h2 className="text-[22px] font-normal uppercase text-[#222] mb-2">
                    {title}
                </h2>
                <p className="text-[18px] font-normal text-[#222]">{message}</p>

                <form
                    onSubmit={(e) => e.preventDefault()}
                    className="relative max-w-[420px] w-full mt-8 mb-6 mx-auto pr-[123px]"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search..."
                        className="w-full h-10 px-4 text-[18px] text-[#222] bg-[#f8fafb] border border-gray-300 rounded-md"
                    />
                    <button
                        type="button"
                        onClick={handleSearch}
                        className="absolute top-0 right-0 w-[120px] h-10 bg-[#ff508e] text-white font-bold text-[18px] rounded-md hover:brightness-105"
                    >
                        Search
                    </button>
                </form>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<FeedbackApp />);
