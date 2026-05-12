import dotenv from "dotenv";
import mysql from "mysql2";
import { fileURLToPath } from "url";
import path from "path";

// Only load .env locally (NOT needed on Render)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection safely
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    return;
  }

  console.log("✅ MySQL connected successfully");
  connection.release();
});

export default pool;