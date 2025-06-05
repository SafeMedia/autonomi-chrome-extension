export default function ImageViewer({ blob }: { blob: Blob }) {
    const objectUrl = URL.createObjectURL(blob);

    return (
        <img
            src={objectUrl}
            alt="Loaded image"
            className="max-w-full max-h-full object-contain"
            onError={() => console.error("Failed to load image")}
        />
    );
}
