import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Archivos de los proyectos generados: no forman parte de la app de icase-tool.
    "plantillas/**",
    // Salidas generadas: documentación compilada, reportes de Playwright y respaldos locales.
    "public/docs/**",
    "docs-site/build/**",
    "docs-site/.docusaurus/**",
    "tests/e2e/reporte/**",
    "tests/e2e/resultados/**",
    "respaldos/**",
  ]),
]);

export default eslintConfig;
