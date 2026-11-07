-- Etapa 9: archivos de la web y la app generados y resultado de su compilación.
alter table public.proyectos add column if not exists frontend_implementacion jsonb;
