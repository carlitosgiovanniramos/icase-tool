#!/bin/sh
# Aplica las migraciones del proyecto (supabase/migrations/*.sql, en orden de nombre) y los datos de
# prueba (supabase/seed.sql), cada archivo una sola vez. Lo aplicado se registra en
# icase.migraciones, un esquema que la API no expone. La carpeta supabase/ llega en /proyecto.
set -e

export PGPASSWORD="$POSTGRES_PASSWORD"
sql() { psql -v ON_ERROR_STOP=1 -X -q -h db -U postgres -d postgres "$@"; }

sql -c "create schema if not exists icase; create table if not exists icase.migraciones (archivo text primary key, aplicado_en timestamptz not null default now());"

aplicar() {
  archivo="$1"
  nombre="$2"
  ya=$(sql -At -c "select 1 from icase.migraciones where archivo = '$nombre'")
  if [ "$ya" = "1" ]; then
    echo "ya aplicado: $nombre"
    return
  fi
  echo "aplicando: $nombre"
  sql -1 -f "$archivo" -c "insert into icase.migraciones (archivo) values ('$nombre')"
}

for archivo in $(ls /proyecto/migrations/*.sql 2>/dev/null | sort); do
  aplicar "$archivo" "$(basename "$archivo")"
done

if [ -s /proyecto/seed.sql ]; then
  aplicar /proyecto/seed.sql seed.sql
fi

echo "migraciones al día"
