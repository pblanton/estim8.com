import { pool } from './pool.js';
import { runMigrations } from './runMigrations.js';

runMigrations()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
