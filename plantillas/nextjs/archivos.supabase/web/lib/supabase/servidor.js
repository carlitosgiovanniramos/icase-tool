import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para el código que corre en el servidor de Next.js (dentro de Docker): llega
// a la puerta de entrada por la red interna, porque "localhost" ahí es el propio contenedor.
export function supabaseServidor(accessToken) {
  return createClient(process.env.SUPABASE_URL_INTERNA, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}
