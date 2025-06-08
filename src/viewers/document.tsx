import { useEffect, useState } from "react";

export default function DocumentViewer({ blob }: { blob: Blob }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(blob);
        setObjectUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [blob]);

    if (!objectUrl) return <p>Loading document...</p>;

    return (
        <iframe
            src={objectUrl}
            title="Document Viewer"
            className="w-full h-full border-none"
            onError={() => console.error("Failed to load document")}
        />
    );
}
