// Plataformas de backend como servicio: no hay un servidor propio con módulos de negocio, los
// clientes usan directamente los servicios de la plataforma. Con ellas el backend se dibuja con
// esos servicios (Auth, Realtime, funciones...), no con módulos que nadie ejecuta.
export const PLATAFORMAS_SERVICIO = [
  {
    nombre: "Supabase",
    patron: /supabase/i,
    servicios: "Auth, API de datos (PostgREST), Realtime, Edge Functions",
    datos: "PostgreSQL y Supabase Storage",
  },
  {
    nombre: "Firebase",
    patron: /firebase(?!\s+cloud\s+messaging)|firestore/i,
    servicios: "Authentication, Cloud Functions, Cloud Messaging",
    datos: "Cloud Firestore y Cloud Storage",
  },
  {
    nombre: "Appwrite",
    patron: /appwrite/i,
    servicios: "Auth, API de datos, Realtime, Functions",
    datos: "la base de datos y el Storage de Appwrite",
  },
];

// Plataforma con la que está hecho el backend de un diagrama de arquitectura (se reconoce por el
// título de su subgraph BACKEND), o null si es un servidor propio.
export function plataformaDeArquitectura(diagrama) {
  const titulo = String(diagrama || "").match(/subgraph\s+BACKEND\s*\["([^"]*)"\]/i)?.[1] || "";
  if (/microservicios/i.test(titulo)) return null;
  return PLATAFORMAS_SERVICIO.find((p) => p.patron.test(titulo)) || null;
}
