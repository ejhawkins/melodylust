import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart({ server: { entry: "server" } }), react(), ...(command === "build" ? [nitro({ preset: "node-server" })] : [])],
  server: { watch: { usePolling: true, interval: 500 }, proxy: { "/api/association": "http://127.0.0.1:3000", "/health": "http://127.0.0.1:3000" } },
}));
