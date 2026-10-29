import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import {
  CreateProductInput,
  UpdateProductInput,
  SetRateInput,
  RateHistoryQuery,
} from './rates.schema';

interface ProductRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
}

interface RateRow {
  id: string;
  product_id: string;
  rate_per_ton: string;
  changed_by_id: string;
  effective_from: Date;
  created_at: Date;
}

interface CurrentRateRow extends ProductRow {
  rate_per_ton: string;
  rate_id: string;
  effective_from: Date;
  changed_by_name: string;
}

interface CountRow {
  count: string;
}

export async function createProduct(input: CreateProductInput) {
  const id = uuidv4();
  await query('INSERT INTO products (id, name) VALUES (?, ?)', [id, input.name]);
  const result = await query<ProductRow>('SELECT * FROM products WHERE id = ?', [id]);
  return result.rows[0];
}

export async function getProducts(includeInactive: boolean = false) {
  const whereClause = includeInactive ? '' : "WHERE p.is_active = true";
  const result = await query<CurrentRateRow>(
    `SELECT p.*,
            r.rate_per_ton,
            r.id AS rate_id,
            r.effective_from,
            u.name AS changed_by_name
     FROM products p
     LEFT JOIN (
       SELECT r1.* FROM rates r1
       INNER JOIN (
         SELECT product_id, MAX(effective_from) as max_date
         FROM rates
         GROUP BY product_id
       ) r2 ON r1.product_id = r2.product_id AND r1.effective_from = r2.max_date
     ) r ON r.product_id = p.id
     LEFT JOIN users u ON r.changed_by_id = u.id
     ${whereClause}
     ORDER BY p.name ASC`
  );
  return result.rows;
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) {
    setClauses.push(`name = ?`);
    params.push(input.name);
  }
  if (input.isActive !== undefined) {
    setClauses.push(`is_active = ?`);
    params.push(input.isActive);
  }

  if (setClauses.length === 0) {
    throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
  }

  await query(
    `UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`,
    [...params, id]
  );
  
  const result = await query<ProductRow>('SELECT * FROM products WHERE id = ?', [id]);
  if (result.rows.length === 0) {
    throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  }
  return result.rows[0];
}

export async function deleteProduct(id: string) {
  const check = await query<{ count: string }>('SELECT COUNT(*) AS count FROM work_entries WHERE product_id = ?', [id]);
  if (parseInt(check.rows[0].count, 10) > 0) {
    throw Object.assign(new Error('Cannot delete product because it has associated work entries.'), { statusCode: 400 });
  }
  
  await query('DELETE FROM rates WHERE product_id = ?', [id]);
  await query('DELETE FROM products WHERE id = ?', [id]);
  return { success: true };
}

export async function setRate(input: SetRateInput, changedById: string) {
  const { productId, ratePerTon } = input;
  const product = await query<ProductRow>('SELECT id, name FROM products WHERE id = ?', [productId]);
  if (product.rows.length === 0) {
    throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  }

  const id = uuidv4();
  await query(
    'INSERT INTO rates (id, product_id, rate_per_ton, changed_by_id) VALUES (?, ?, ?, ?)',
    [id, productId, ratePerTon, changedById]
  );
  
  const result = await query<RateRow>('SELECT * FROM rates WHERE id = ?', [id]);
  return { ...result.rows[0], product_name: product.rows[0].name };
}

export async function getCurrentRates() {
  return getProducts(false);
}

export async function getProductCurrentRate(productId: string) {
  const result = await query<RateRow>(
    `SELECT * FROM rates
     WHERE product_id = ?
     ORDER BY effective_from DESC
     LIMIT 1`,
    [productId]
  );
  if (result.rows.length === 0) {
    throw Object.assign(new Error('No rate set for this product'), { statusCode: 404 });
  }
  return result.rows[0];
}

export async function getRateHistory(filters: RateHistoryQuery) {
  const { page, limit, productId } = filters;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (productId) {
    conditions.push(`r.product_id = ?`);
    params.push(productId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await query<CountRow>(`SELECT COUNT(*) AS count FROM rates r ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await query<RateRow>(
    `SELECT r.*, p.name AS product_name, u.name AS changed_by_name
     FROM rates r
     JOIN products p ON r.product_id = p.id
     LEFT JOIN users u ON r.changed_by_id = u.id
     ${whereClause}
     ORDER BY r.effective_from DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    rates: dataResult.rows,
    total,
    page,
    limit,
  };
}
