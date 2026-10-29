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

  for (const file of files) {
    console.log(`  📄 Running: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    try {
      for (const stmt of statements) {
        await connection.query(stmt);
      }
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
