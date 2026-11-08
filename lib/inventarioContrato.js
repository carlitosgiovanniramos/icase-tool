// Solo metadatos y muestras del proyecto desechable; nunca auth.users ni claves privadas.
export const CONSULTA_INVENTARIO = `select json_build_object(
  'tablas', (select coalesce(json_agg(t order by t.nombre), '[]') from (
    select c.relname as nombre, c.relkind in ('v','m') as vista, c.relrowsecurity as rls,
      (select coalesce(json_agg(json_build_object('nombre', a.attname, 'tipo', format_type(a.atttypid,a.atttypmod),
        'requerida', a.attnotnull and a.attidentity = '' and a.attgenerated = '' and not exists(select 1 from pg_attrdef d where d.adrelid=c.oid and d.adnum=a.attnum),
        'primaria', exists(select 1 from pg_index i where i.indrelid=c.oid and i.indisprimary and a.attnum=any(i.indkey))) order by a.attnum), '[]')
        from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as columnas,
      (select coalesce(json_agg(json_build_object('nombre',policyname,'operacion',cmd,'roles',roles,'usando',qual,'comprobando',with_check)), '[]')
        from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as politicas,
      case when exists(select 1 from pg_roles where rolname='authenticated') then json_build_object(
        'select',has_table_privilege('authenticated',c.oid,'select'), 'insert',has_table_privilege('authenticated',c.oid,'insert'),
        'update',has_table_privilege('authenticated',c.oid,'update') or has_any_column_privilege('authenticated',c.oid,'update'), 'delete',has_table_privilege('authenticated',c.oid,'delete')) end as permisos
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m')
  ) t),
  'funciones', (select coalesce(json_agg(f order by f.nombre,f.argumentos), '[]') from (
    select p.proname as nombre, pg_get_function_identity_arguments(p.oid) as firma,
      pg_get_function_arguments(p.oid) as argumentos, p.proargnames as "nombresArgumentos",
      p.pronargs as "cantidadArgumentos", p.pronargdefaults as "argumentosConDefecto",
      pg_get_function_result(p.oid) as retorno, p.prosecdef as "securityDefiner",
      case when exists(select 1 from pg_roles where rolname='authenticated') then has_function_privilege('authenticated',p.oid,'execute') else false end as ejecutable,
      pg_get_functiondef(p.oid) as definicion
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.prorettype <> 'trigger'::regtype
      and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
  ) f)
)`;

export const CONSULTA_USUARIOS_CONTRATO = `select coalesce(json_agg(json_build_object('email',email,'rol',coalesce(raw_app_meta_data->>'rol',raw_app_meta_data->>'role','')) order by email),'[]') from auth.users where email like '%@prueba.local'`;
