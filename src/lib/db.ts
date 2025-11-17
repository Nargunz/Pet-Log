import mysql, { Pool } from "mysql2/promise";

declare global {
  var mysqlPool: Pool | undefined;
}

export function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  console.log(databaseUrl);

  if (!databaseUrl) {
    throw new Error(databaseUrl);
  }

  if (!globalThis.mysqlPool) {
    globalThis.mysqlPool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return globalThis.mysqlPool;
}

