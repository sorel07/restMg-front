import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  // Modo de Salida: 'server' para habilitar SSR, middleware y APIs de servidor.
  output: "server",

  // Adaptador: Le dice a Astro cómo construir para Vercel.
  adapter: vercel(),

  // URL del Sitio: Sigue siendo importante para generar sitemaps, etc.
  site: "https://restmg.vercel.app",
});
