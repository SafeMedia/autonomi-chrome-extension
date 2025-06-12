import { useEffect, useState } from "react";

export default function ImageViewer({ blob }: { blob: Blob }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setError(false); // reset on new blob

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [blob]);

    if (error) {
        return (
            <div className="text-red-500 text-center">
                Failed to load image. The file might be corrupted or
                unsupported.
            </div>
        );
    }

    if (!objectUrl) {
        return <p className="text-white">Loading image...</p>;
    }

    return (
        <img
            src={objectUrl}
            alt="Loaded file"
            className="max-w-full max-h-full object-contain"
            onError={() => {
                console.error("Failed to load image from blob");
                setError(true);
            }}
        />
    );
}
