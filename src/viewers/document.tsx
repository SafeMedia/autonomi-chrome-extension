export default function DocumentViewer({ blob }: { blob: Blob }) {
    const objectUrl = URL.createObjectURL(blob);

    return (
        <iframe
            src={objectUrl}
            title="Document Viewer"
            className="w-full h-full border-none"
            onError={() => console.error("Failed to load document")}
        />
    );
}
