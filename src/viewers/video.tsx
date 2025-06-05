export default function VideoViewer({ blob }: { blob: Blob }) {
    const objectUrl = URL.createObjectURL(blob);

    return (
        <video
            src={objectUrl}
            controls
            className="max-w-full max-h-full"
            onError={() => console.error("Failed to play video")}
        />
    );
}
