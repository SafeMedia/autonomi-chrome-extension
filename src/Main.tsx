import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import Header from "./Header.tsx";
import { Toaster } from "sonner";
import "./tailwind.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <div className="w-full">
            <Header />
            <App />
            <Toaster />
        </div>
    </StrictMode>
);
