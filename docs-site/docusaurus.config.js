// @ts-check
// Documentación de I-CASE Tool (Docusaurus). Se publica dentro de la misma aplicación, en /docs:
// `npm run docs:build` (en la raíz del repo) genera el sitio estático en public/docs y Next.js lo
// sirve junto con la app. En local: `npm run docs` (servidor de Docusaurus en el puerto 3001).

import { themes as prismThemes } from "prism-react-renderer";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "I-CASE Tool",
  tagline: "Herramienta CASE que genera con inteligencia artificial los artefactos de cada fase del desarrollo de software",
  favicon: "img/favicon.ico",

  future: {
    v4: true,
  },

  // Se sirve desde la misma aplicación: https://<dominio de icase-tool>/docs/
  url: "https://icase-tool.vercel.app",
  baseUrl: "/docs/",
  trailingSlash: false,

  onBrokenLinks: "throw",
  markdown: {
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: "warn" },
  },

  i18n: {
    defaultLocale: "es",
    locales: ["es"],
  },

  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // La documentación es el sitio entero: /docs/ abre la portada.
          routeBasePath: "/",
          sidebarPath: "./sidebars.js",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
    [
      "redocusaurus",
      {
        // Referencia de la API generada desde la especificación OpenAPI.
        specs: [
          {
            id: "icase-tool",
            spec: "openapi/icase-tool.yaml",
            route: "/api/referencia",
          },
        ],
        theme: {
          primaryColor: "#1e293b",
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "I-CASE Tool · Documentación",
        items: [
          { type: "docSidebar", sidebarId: "manual", position: "left", label: "Manual de usuario" },
          { type: "docSidebar", sidebarId: "api", position: "left", label: "API" },
          { type: "docSidebar", sidebarId: "ia", position: "left", label: "IA y prompts" },
          { type: "docSidebar", sidebarId: "desarrolladores", position: "left", label: "Desarrolladores" },
          // pathname:/// sale de Docusaurus hacia la aplicación (misma URL, sin /docs).
          { href: "pathname:///", label: "Abrir I-CASE Tool", position: "right" },
        ],
      },
      footer: {
        style: "dark",
        copyright: `I-CASE Tool · ${new Date().getFullYear()}`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ["bash", "json", "sql", "yaml"],
      },
      mermaid: {
        theme: { light: "neutral", dark: "dark" },
      },
    }),
};

export default config;
