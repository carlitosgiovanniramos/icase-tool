-- Archivos de código que genera la fase de Implementación (backend, frontend, base de datos).
-- Los archivos fijos de cada stack (Dockerfile, docker-compose.yml...) no se guardan aquí: salen
-- de plantillas/ al armar el proyecto. Ejecutar una vez en el SQL Editor de Supabase.
create table if not exists archivos_proyecto (
  id             uuid primary key default gen_random_uuid(),
  proyecto_id    uuid not null references proyectos(id) on delete cascade,
  ruta           text not null,                     -- relativa a la raíz del proyecto, ej. backend/src/index.js
  contenido      text not null default '',
  paso           text not null,                     -- paso de Implementación que lo generó
  estado         text not null default 'generado',  -- generado | editado | error
  hash           text,                              -- huella del contenido, para saber si cambió
  actualizado_en timestamptz not null default now(),
  unique (proyecto_id, ruta)
);

create index if not exists archivos_proyecto_proyecto on archivos_proyecto (proyecto_id);

-- Mismo modelo que proyectos: cada usuario solo ve y modifica los archivos de sus proyectos.
alter table archivos_proyecto enable row level security;

create policy "seleccionar_archivos_propios"
  on archivos_proyecto for select
  using (exists (select 1 from proyectos p where p.id = proyecto_id and p.user_id = auth.uid()));

create policy "crear_archivos_propios"
  on archivos_proyecto for insert
  with check (exists (select 1 from proyectos p where p.id = proyecto_id and p.user_id = auth.uid()));

create policy "actualizar_archivos_propios"
  on archivos_proyecto for update
  using (exists (select 1 from proyectos p where p.id = proyecto_id and p.user_id = auth.uid()));

create policy "eliminar_archivos_propios"
  on archivos_proyecto for delete
  using (exists (select 1 from proyectos p where p.id = proyecto_id and p.user_id = auth.uid()));
