// components/Spinner.tsx
export default function Spinner() {
    return (
        <div className="flex justify-center mt-4">
            <div className="spinner" />
            <style>{`
                .spinner {
                    border: 8px solid #f3f3f3;
                    border-top: 8px solid #3498db;
                    border-radius: 50%;
                    width: 60px;
                    height: 60px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
