-- Etapa 7: operaciones por acción, inventario probado y matriz de permisos.
alter table public.proyectos add column if not exists contrato_implementacion jsonb;
