import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tinyfishApiPlugin } from "./server/tinyfish.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react(), tailwindcss(), tinyfishApiPlugin(env)]
  };
});
