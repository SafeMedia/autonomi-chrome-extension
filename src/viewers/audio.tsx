import { useEffect, useState } from "react";

export default function AudioViewer({ blob }: { blob: Blob }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [blob]);

    if (!objectUrl) return <p>Loading audio...</p>;

    return (
        <audio
            src={objectUrl}
            controls
            className="w-full max-w-md"
            onError={() => console.error("Failed to load audio")}
        />
    );
}
