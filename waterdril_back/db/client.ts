// =============================================================================
//  MySQL connection pool (mysql2 — the actively-maintained driver).
//
//  A thin `client.query(sql, params)` wrapper returns just the rows (or the
//  result header for writes), matching the shape the repository layer expects,
//  so query call-sites stay driver-agnostic. All queries are parameterised.
// =============================================================================
import mysql from "mysql2/promise";
import { DATABASE } from "../config/config.ts";

const pool = mysql.createPool({
  host: DATABASE.HOST,
  port: DATABASE.PORT,
  user: DATABASE.USER,
  password: DATABASE.PASSWORD,
  database: DATABASE.NAME,
  connectionLimit: DATABASE.POOL_SIZE,
  waitForConnections: true,
  enableKeepAlive: true,
});

/** A query function bound either to the pool or a transaction connection. */
// deno-lint-ignore no-explicit-any
export type Querier = (sql: string, params?: any[]) => Promise<any>;

const client = {
  /** Run a parameterised query, returning rows (SELECT) or the result header. */
  // deno-lint-ignore no-explicit-any
  query: async (sql: string, params: any[] = []): Promise<any> => {
    const [result] = await pool.query(sql, params);
    return result;
  },

  /**
   * Run `fn` inside a single transaction. `fn` receives a `query` bound to the
   * transaction connection; commits on success, rolls back on any thrown error.
   */
  withTransaction: async <T>(fn: (query: Querier) => Promise<T>): Promise<T> => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // deno-lint-ignore no-explicit-any
      const query: Querier = async (sql: string, params: any[] = []) => {
        const [result] = await conn.query(sql, params);
        return result;
      };
      const out = await fn(query);
      await conn.commit();
      return out;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};

export default client;
