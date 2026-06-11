/**
 * Pro Market Algérie — Database Initializer
 * Run: node db/init.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'promarket_algerie',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function init() {
  console.log('🔧 Initializing Pro Market Algérie database...\n');
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(sql);
    console.log('✅  Schema created successfully.');

    // Seed an admin user
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin@123!', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ('admin@promarketalgerie.com', $1, 'Administrateur', 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [hash]
    );
    console.log('✅  Admin user created: admin@promarketalgerie.com / Admin@123!');
    console.log('\n🚀  Database ready. Run "npm run dev" to start the API.\n');
  } catch (err) {
    console.error('❌  Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
