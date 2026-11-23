-- Fase de Pruebas. Ejecutar una vez en el SQL Editor de Supabase. Las políticas RLS de proyectos ya cubren
-- las columnas nuevas.
--   pruebas_plan:    paso "Plan de pruebas" (casos, resultados y hallazgos).
--   informe_cerrado: copia fija del informe al cerrar el proyecto ({ fecha, html }).
alter table public.proyectos add column if not exists pruebas_plan jsonb;
alter table public.proyectos add column if not exists informe_cerrado jsonb;
