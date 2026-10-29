const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function replacePgWithMysql(filePath) {
  if (!filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Convert PostgreSQL $1, $2, $3 to ?
  const regex = /\$\d+/g;
  if (regex.test(content)) {
    content = content.replace(regex, '?');
    changed = true;
  }

  // 2. Convert ILIKE to LIKE
  if (content.includes('ILIKE')) {
    content = content.replace(/ILIKE/g, 'LIKE');
    changed = true;
  }

  // 3. Remove RETURNING * and handle UUIDs manually if needed?
  // We can't automatically rewrite logic for RETURNING *.
  // For MySQL, we'll just implement the `query` wrapper in database.ts to simulate pg behavior as close as possible.

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

walkDir(serverDir, replacePgWithMysql);

// Update database.ts to use mysql2
const dbFile = path.join(serverDir, 'config', 'database.ts');
let dbContent = `
import mysql, { Pool, Connection } from 'mysql2/promise';
import { config } from './index';
import logger from '../utils/logger';

const pool = mysql.createPool({
  uri: config.databaseUrl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function query<T extends object = any>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  // We will intercept RETURNING * and handle it?
  // It's too complex to handle RETURNING * generically in MySQL.
  // We will strip RETURNING * if it exists and just run the query.
  // Wait, if it's an INSERT/UPDATE, we need the result.
  let isInsertOrUpdate = text.trim().toUpperCase().startsWith('INSERT') || text.trim().toUpperCase().startsWith('UPDATE');
  let cleanText = text.replace(/RETURNING\\s+\\*/i, '');

  const [result] = await pool.query(cleanText, params);
  const duration = Date.now() - start;
  logger.debug(\`Query (\${duration}ms): \${text.substring(0, 100)}\`);

  if (Array.isArray(result)) {
    return { rows: result as T[], rowCount: result.length };
  } else {
    // It's a ResultSetHeader
    const header = result as any;
    // If it's an insert or update and they expected RETURNING *, we can't easily return the whole row unless we SELECT it.
    // However, if we just return an empty array, it will break getWorkerById etc.
    // Wait, createWorker uses returning *. 
    // We can fetch it if insertId is present!
    if (header.insertId) {
       // but we used UUIDs! insertId will be 0.
       // This requires manual fixing of the services.
    }
    return { rows: [] as T[], rowCount: header.affectedRows };
  }
}

export async function transaction<T>(
  callback: (client: Connection) => Promise<T>
): Promise<T> {
  const client = await pool.getConnection();
  try {
    await client.beginTransaction();
    const result = await callback(client);
    await client.commit();
    return result;
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}

export async function getClient() {
  return pool.getConnection();
}

export { pool };
`;
fs.writeFileSync(dbFile, dbContent.trim());
console.log('Updated database.ts');
