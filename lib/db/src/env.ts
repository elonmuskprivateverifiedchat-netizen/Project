import { URL } from "url";

export function getDatabaseUrl(): string | undefined {
  const url =
    process.env.DATABASE_URL ??
    process.env.RAILWAY_DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DB_URL ??
    process.env.DATABASE_URL_OVERRIDE;

  if (url) {
    return url;
  }

  const host = process.env.PGHOST ?? process.env.PGHOSTADDR;
  if (!host) {
    return undefined;
  }

  const user = process.env.PGUSER ?? process.env.POSTGRES_USER ?? "postgres";
  const password = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD;
  const database = process.env.PGDATABASE ?? process.env.POSTGRES_DB ?? "postgres";
  const port = process.env.PGPORT ?? "5432";

  const connection = new URL("postgresql://localhost");
  connection.hostname = host;
  connection.port = port;

  if (user) {
    connection.username = user;
  }

  if (password) {
    connection.password = password;
  }

  connection.pathname = `/${database}`;

  const sslMode = process.env.PGSSLMODE ?? process.env.SSLMODE ?? process.env.SSL;
  if (sslMode) {
    connection.searchParams.set("sslmode", sslMode);
  }

  return connection.toString();
}
