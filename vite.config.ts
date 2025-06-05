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
                main: resolve(__dirname, "index.html"),
                browser: resolve(__dirname, "browser.html"),
            },
        },
    },
});
