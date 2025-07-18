import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        rollupOptions: {
            input: {
                feedback: resolve(__dirname, "feedback.html"),
                upload: resolve(__dirname, "upload.html"),
                main: resolve(__dirname, "index.html"),
                viewer: resolve(__dirname, "viewer.html"),
            },
        },
    },
});
