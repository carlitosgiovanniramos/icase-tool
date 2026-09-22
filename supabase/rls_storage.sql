-- El bucket "archivos-proyecto" ya viene con RLS activo por defecto en Supabase
-- (storage.objects es una tabla del sistema), así que no hace falta "enable row
-- level security" acá, solo agregar las políticas.
--
-- Los archivos ahora se suben como "<user_id>/documentos/..." o
-- "<user_id>/imagenes/...". storage.foldername(name) parte esa ruta en un
-- array; la posición [1] es el primer segmento, es decir el user_id.

create policy "usuarios_suben_su_carpeta"
  on storage.objects for insert
  with check (
    bucket_id = 'archivos-proyecto'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuarios_leen_su_carpeta"
  on storage.objects for select
  using (
    bucket_id = 'archivos-proyecto'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuarios_actualizan_su_carpeta"
  on storage.objects for update
  using (
    bucket_id = 'archivos-proyecto'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "usuarios_eliminan_su_carpeta"
  on storage.objects for delete
  using (
    bucket_id = 'archivos-proyecto'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
