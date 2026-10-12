-- Imagen SVG ya dibujada de los diagramas PlantUML (los dibuja Kroki, un servicio externo).
-- Se guarda para que abrir un proyecto no dependa de que Kroki esté en línea: Kroki solo se
-- usa al generar o editar el diagrama. Formato: { "<paso>": { "hash": "<del código>", "svg": "<svg>" } }.
-- Ejecutar una vez en el SQL Editor de Supabase. Las políticas RLS de proyectos ya la cubren.
alter table proyectos
  add column if not exists diagramas_svg jsonb;
