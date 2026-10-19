-- Stack de implementación de cada proyecto: piezas del catálogo (plantillas/) y alta disponibilidad.
-- Lo llena el paso "Stack técnico" a partir de la arquitectura y el diagrama de sistemas. Formato:
--   { "piezas": [{ "pieza": "supabase", "opcionales": ["auth", "realtime"] }, { "pieza": "nextjs" }],
--     "altaDisponibilidad": true }
-- Ejecutar una vez en el SQL Editor de Supabase. Las políticas RLS de proyectos ya la cubren.
alter table proyectos
  add column if not exists stack_implementacion jsonb;
