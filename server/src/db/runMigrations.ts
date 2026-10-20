import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

export async function runMigrations(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    const applied = new Set((rows as { name: string }[]).map((r) => r.name));

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      console.log(`Applying migration ${file}...`);
      const statements = sql
        .split(/;\s*(?:\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await conn.query(statement);
      }
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log(`Applied ${file}`);
    }

    console.log('Migrations up to date.');
  } finally {
    conn.release();
  }
}
