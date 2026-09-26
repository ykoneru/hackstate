import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    // Tunnels that let a phone open the app from the QR code.
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.app"],
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
