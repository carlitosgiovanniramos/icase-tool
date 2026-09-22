import "./globals.css";

export const metadata = {
  title: "I-CASE Tool",
  description: "Herramienta de análisis y diseño con IA",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}