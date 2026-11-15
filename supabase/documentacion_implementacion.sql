-- Paso "Documentación" de la Implementación: resumen del sitio de documentación del proyecto (páginas por
-- sección y archivos). Las páginas van en archivos_proyecto con paso = 'impl_documentacion'.
-- Ejecutar una vez en el SQL Editor de Supabase. Las políticas RLS de proyectos ya la cubren.
alter table public.proyectos add column if not exists documentacion_implementacion jsonb;
