-- Contexto de elicitación del análisis: campos opcionales (problema, alcance, usuarios,
-- plataformas, reglas de negocio, atributos de calidad) y las respuestas de la entrevista
-- con IA. Se usa al generar los requerimientos. Ejecutar una vez en el SQL Editor de Supabase.
alter table proyectos
  add column if not exists contexto jsonb;
