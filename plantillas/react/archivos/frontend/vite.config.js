import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En el contenedor, nginx redirige /api al backend. El proxy de aquí solo sirve si se ejecuta
// "npm run dev" fuera de Docker, con el backend en localhost:4000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:4000" },
  },
});
