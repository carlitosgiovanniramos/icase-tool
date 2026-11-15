// Sitio de documentación del proyecto. El nombre y la descripción salen de proyecto.json, que genera el
// paso "Documentación" junto con las páginas (docs/) y los diagramas (static/img/diagramas/).
import { readFileSync } from "node:fs";

const proyecto = JSON.parse(readFileSync(new URL("./proyecto.json", import.meta.url), "utf8"));

export default {
  title: proyecto.nombre,
  tagline: proyecto.descripcion,
  url: "http://localhost",
  baseUrl: "/",
  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",
  i18n: { defaultLocale: "es", locales: ["es"] },
  markdown: { format: "detect" },
  presets: [
    [
      "classic",
      {
        docs: { routeBasePath: "/", sidebarPath: "./sidebars.js" },
        blog: false,
        pages: false,
        theme: { customCss: "./src/css/custom.css" },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: `${proyecto.nombre} · Documentación`,
      items: [
        { type: "docSidebar", sidebarId: "manual", position: "left", label: "Manual de usuario" },
        { type: "docSidebar", sidebarId: "desarrolladores", position: "left", label: "Desarrolladores" },
        { type: "docSidebar", sidebarId: "api", position: "left", label: "API" },
      ],
    },
    footer: { style: "light", copyright: `Documentación generada con I-CASE Tool · ${proyecto.generado}` },
    colorMode: { respectPrefersColorScheme: true },
  },
};
