-- Estructura de carpetas de cada proyecto: los archivos que hay que escribir en cada pieza del
-- stack, con su propósito, requerimientos, pantallas, tablas y módulo. La llena el paso
-- "Estructura de carpetas". Ejecutar una vez en el SQL Editor de Supabase.
alter table proyectos
  add column if not exists estructura_implementacion jsonb;
