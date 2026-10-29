import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function seed() {
  console.log('🌱 Starting database seeding (MySQL)...\n');

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    await connection.beginTransaction();

    // ─── 1. Seed Admin User ───────────────────────────────
    const adminEmail = 'admin@lms.com';
    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();

    const [existingAdmin]: any = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );

    let finalAdminId = adminId;
    if (existingAdmin.length === 0) {
      await connection.query(
        `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        [adminId, 'Admin', adminEmail, passwordHash, 'ADMIN']
      );
      console.log(`  ✅ Admin user created: ${adminEmail}`);
    } else {
      finalAdminId = existingAdmin[0].id;
      console.log(`  ⏭️  Admin user already exists: ${adminEmail}`);
    }

    // ─── 2. Seed Products & Initial Rates ─────────────────
    const products = [
      { name: 'Cement', rate: 50 },
      { name: 'Rice', rate: 45 },
      { name: 'Fertilizer', rate: 40 },
      { name: 'Sugar', rate: 42 },
      { name: 'Wheat', rate: 38 },
    ];

    for (const item of products) {
      const [existingProduct]: any = await connection.query(
        'SELECT id FROM products WHERE name = ?',
        [item.name]
      );

      let productId = uuidv4();

      if (existingProduct.length === 0) {
        await connection.query(
          `INSERT INTO products (id, name) VALUES (?, ?)`,
          [productId, item.name]
        );
      } else {
        productId = existingProduct[0].id;
      }

      const [rateExists]: any = await connection.query(
        'SELECT id FROM rates WHERE product_id = ? LIMIT 1',
        [productId]
      );

      if (rateExists.length === 0) {
        await connection.query(
          `INSERT INTO rates (id, product_id, rate_per_ton, changed_by_id) VALUES (?, ?, ?, ?)`,
          [uuidv4(), productId, item.rate, finalAdminId]
        );
        console.log(`  📦 ${item.name}: ₹${item.rate}/ton`);
      } else {
        console.log(`  ⏭️  ${item.name} already has a rate, skipping.`);
      }
    }

    await connection.commit();
    console.log('\n✅ Seeding finished successfully!');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Seeding failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seed();
