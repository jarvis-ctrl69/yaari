import { Pool } from "pg";

export const pool = new Pool({
  host: "localhost",
  port: 5433,
  database: "yaari",
  user: "postgres",
  password: "Passme123",
});