import dotenv from 'dotenv';
import mysql from 'mysql2'

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'spa_management'
})

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err)
  } else {
    console.log(`✅ Connected to MySQL database at ${process.env.DB_HOST || 'localhost'}`)
  }
})

export default db
