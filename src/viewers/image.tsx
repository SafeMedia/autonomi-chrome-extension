import { useEffect, useState } from "react";

export default function ImageViewer({ blob }: { blob: Blob }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [blob]);

    if (!objectUrl) {
        return <p>Loading image...</p>;
    }

    return (
        <img
            src={objectUrl}
            alt="Loaded image"
            className="max-w-full max-h-full object-contain"
            onError={() => console.error("Failed to load image")}
        />
    );
}
