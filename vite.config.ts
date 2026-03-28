import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tinyfishApiPlugin } from "./server/tinyfish.js";

export default defineConfig({
  plugins: [react(), tailwindcss(), tinyfishApiPlugin()],
});
