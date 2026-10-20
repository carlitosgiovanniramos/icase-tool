/** @type {import('next').NextConfig} */
const nextConfig = {
  // Documentación (Docusaurus, docs-site/): se genera como sitio estático en public/docs y se sirve
  // en /docs de la misma aplicación. Los archivos que existen (js, css, imágenes) se sirven tal
  // cual; cada página /docs/x es el archivo /docs/x.html.
  async rewrites() {
    return [
      { source: "/docs", destination: "/docs/index.html" },
      { source: "/docs/:ruta*", destination: "/docs/:ruta*.html" },
    ];
  },
};

export default nextConfig;
