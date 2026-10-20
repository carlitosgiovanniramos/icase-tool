-- Base de datos de cada proyecto: los archivos SQL generados (con su tabla y lo que la validación
-- no pudo corregir) y el resultado de la última prueba en contenedores. La llena el paso "Base de
-- datos"; el código de cada archivo se guarda en archivos_proyecto (paso impl_bd). Ejecutar una
-- vez en el SQL Editor de Supabase.
alter table proyectos
  add column if not exists bd_implementacion jsonb;
