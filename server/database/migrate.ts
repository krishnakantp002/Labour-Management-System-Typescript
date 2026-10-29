import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  console.log('🚀 Starting database migration (MySQL)...\n');

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  // Track which migrations have already been applied (skip on re-run)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`
  );

  // Legacy databases were migrated before tracking existed — if the app's
  // own tables are present, mark the initial migration as applied.
  const [tracked]: any = await connection.query('SELECT filename FROM schema_migrations');
  const applied = new Set<string>(tracked.map((r: any) => r.filename));
  if (applied.size === 0) {
    const [tables]: any = await connection.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'`
    );
    if (tables.length > 0) {
      await connection.query(`INSERT INTO schema_migrations (filename) VALUES ('001_initial_schema.sql')`);
      console.log('  ⏭️  001_initial_schema.sql already applied (existing database), marked as done.\n');
      applied.add('001_initial_schema.sql');
    }
  }

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ⏭️  Skipped (already applied): ${file}`);
      continue;
    }
    console.log(`  📄 Running: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = sql.split(';').map((s) => s.trim()).filter((s) => s.length > 0);

    try {
      for (const stmt of statements) {
        await connection.query(stmt);
      }
      await connection.query(`INSERT INTO schema_migrations (filename) VALUES (?)`, [file]);
      console.log(`  ✅ Complete: ${file}\n`);
    } catch (error) {
      console.error(`  ❌ Failed: ${file}`);
      console.error(`     Error: ${(error as Error).message}\n`);
      await connection.end();
      process.exit(1);
    }
  }

  await connection.end();
  console.log('✅ All migrations completed successfully!');
}

migrate();
