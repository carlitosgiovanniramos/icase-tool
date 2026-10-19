import pg from "pg";

// La cadena de conexión llega desde docker-compose.yml; "db" es el nombre del contenedor de
// PostgreSQL dentro de la red de Docker.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
