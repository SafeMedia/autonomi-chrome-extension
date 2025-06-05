export default function AudioViewer({ blob }: { blob: Blob }) {
    const objectUrl = URL.createObjectURL(blob);

    return (
        <audio
            src={objectUrl}
            controls
            className="w-full max-w-md"
            onError={() => console.error("Failed to load audio")}
        />
    );
}
