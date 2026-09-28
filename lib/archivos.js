// Sube un archivo al bucket "archivos-proyecto" dentro de la carpeta del usuario
// (<user_id>/<carpeta>/...), que es lo que exigen las políticas de supabase/rls_storage.sql.
// Devuelve la URL pública del archivo.
export async function subirArchivoProyecto(supabase, file, carpeta) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

  // Sin espacios, tildes ni símbolos en la ruta: evitan problemas en la URL pública.
  const nombreSeguro = file.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-");
  const ruta = `${user.id}/${carpeta}/${Date.now()}-${nombreSeguro}`;

  const { error } = await supabase.storage.from("archivos-proyecto").upload(ruta, file);
  if (error) {
    throw new Error(
      /row-level security/i.test(error.message)
        ? "Supabase Storage no tiene permiso para guardar archivos. Ejecuta supabase/rls_storage.sql en el SQL Editor de Supabase."
        : error.message
    );
  }

  return supabase.storage.from("archivos-proyecto").getPublicUrl(ruta).data.publicUrl;
}
