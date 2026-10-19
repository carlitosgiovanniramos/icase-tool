import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para el código que corre en el navegador: usa la dirección pública
// (localhost y el puerto de la puerta de entrada), fijada al compilar.
export function supabaseNavegador() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
