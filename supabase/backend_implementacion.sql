-- Etapa 8: archivos del backend generados (Edge Functions o Express) y resultado de su prueba.
alter table public.proyectos add column if not exists backend_implementacion jsonb;
