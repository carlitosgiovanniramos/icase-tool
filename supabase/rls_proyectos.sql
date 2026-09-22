-- 1. Cada proyecto queda asociado a quien lo creó.
--    El "default auth.uid()" hace que, al insertar desde el navegador ya logueado,
--    Supabase complete esta columna solo con el id del usuario autenticado.
alter table proyectos
  add column user_id uuid references auth.users(id) default auth.uid();

-- 2. Sin esto, RLS existe pero no se aplica: la tabla seguiría siendo pública.
alter table proyectos enable row level security;

-- 3. Una política por operación. Sin política para una operación, esa operación
--    queda bloqueada para todos (ese es el modelo "deny by default" de RLS).
create policy "seleccionar_propios_proyectos"
  on proyectos for select
  using (auth.uid() = user_id);

create policy "crear_propios_proyectos"
  on proyectos for insert
  with check (auth.uid() = user_id);

create policy "actualizar_propios_proyectos"
  on proyectos for update
  using (auth.uid() = user_id);

create policy "eliminar_propios_proyectos"
  on proyectos for delete
  using (auth.uid() = user_id);
