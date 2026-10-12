-- Código Mermaid del diagrama de clases (primer paso de la fase de Diseño, antes del
-- diagrama entidad-relación).
-- Ejecutar una vez en el SQL Editor de Supabase. Las políticas RLS de proyectos ya la cubren.
alter table proyectos
  add column if not exists diagrama_clases text;
