import { useEffect, useState } from "react";

export default function VideoViewer({ blob }: { blob: Blob }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [blob]);

    if (!objectUrl) return <p>Loading video...</p>;

    return (
        <video
            src={objectUrl}
            controls
            className="max-w-full max-h-full"
            onError={() => console.error("Failed to play video")}
        />
    );
}
