import mysql, { Pool } from "mysql2/promise";

declare global {
  var mysqlPool: Pool | undefined;
}

export function getPool(): Pool {
  const host = process.env.MYSQL_HOST;
  const database = process.env.MYSQL_DATABASE;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const port = Number(process.env.MYSQL_PORT || 3306);
  const sslEnabled = process.env.MYSQL_SSL === "true" || process.env.MYSQL_SSL === "1";

  if (!host || !database || !user) {
    throw new Error("MySQL env variables are not fully set.");
  }

  if (!globalThis.mysqlPool) {
    const poolConfig: mysql.PoolOptions = {
      host,
      database,
      user,
      password,
      port,
      waitForConnections: true,
      connectionLimit: 10,
    };

    // Add SSL configuration for Digital Ocean and other managed databases
    if (sslEnabled) {
      poolConfig.ssl = {
        rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false",
      };
    }

    globalThis.mysqlPool = mysql.createPool(poolConfig);
  }

  return globalThis.mysqlPool;
}

