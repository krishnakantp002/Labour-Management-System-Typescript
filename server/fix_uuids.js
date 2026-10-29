const fs = require('fs');
const path = require('path');

const services = [
  'attendance/attendance.service.ts',
  'rates/rates.service.ts',
  'work/work.service.ts',
  'payments/payments.service.ts',
];

const basePath = path.join(__dirname, 'src', 'modules');

services.forEach(service => {
  const file = path.join(basePath, service);
  let content = fs.readFileSync(file, 'utf8');

  // Add import if missing
  if (!content.includes("import { v4 as uuidv4 }")) {
    content = "import { v4 as uuidv4 } from 'uuid';\n" + content;
  }

  // Find INSERT INTO patterns and modify them to inject ID
  // e.g. INSERT INTO attendance (worker_id, ...) VALUES (?, ...)
  // Change to: INSERT INTO attendance (id, worker_id, ...) VALUES (?, ?, ...)

  // We will just do a simple replacement for the specific tables
  
  if (service.includes('attendance')) {
    content = content.replace(
      /INSERT INTO attendance \(worker_id, date, status, marked_by_id\)\s*VALUES \(\?, \?, \?, \?\)/,
      "const id = uuidv4();\n    await query('INSERT INTO attendance (id, worker_id, date, status, marked_by_id) VALUES (?, ?, ?, ?, ?)', [id, workerId, date, status, markedById]);\n    const result = await query('SELECT * FROM attendance WHERE id = ?', [id]);\n    return result.rows[0];"
    );
    // Replace bulk
    content = content.replace(
      /INSERT INTO attendance \(worker_id, date, status, marked_by_id\)\s*VALUES\s*/,
      "INSERT INTO attendance (id, worker_id, date, status, marked_by_id) VALUES "
    );
    content = content.replace(
      /let valuesString = records\.map\(\(_, i\) => `\(\\\$\$\{i \* 4 \+ 1\}, \\\$\$\{i \* 4 \+ 2\}, \\\$\$\{i \* 4 \+ 3\}, \\\$\$\{i \* 4 \+ 4\}\)`\)/g,
      "let valuesString = records.map(() => `(?, ?, ?, ?, ?)`)"
    );
    content = content.replace(
      /records\.flatMap\(\(r\) => \[r\.workerId, date, r\.status, markedById\]\)/,
      "records.flatMap((r) => [uuidv4(), r.workerId, date, r.status, markedById])"
    );
  }

  if (service.includes('rates')) {
    content = content.replace(
      /INSERT INTO products \(name\)\s*VALUES \(\?\)/,
      "const id = uuidv4();\n    await query('INSERT INTO products (id, name) VALUES (?, ?)', [id, input.name]);\n    const result = await query('SELECT * FROM products WHERE id = ?', [id]);\n    return result.rows[0];"
    );
    content = content.replace(
      /INSERT INTO rates \(product_id, rate_per_ton, changed_by_id\)\s*VALUES \(\?, \?, \?\)/,
      "const id = uuidv4();\n    await query('INSERT INTO rates (id, product_id, rate_per_ton, changed_by_id) VALUES (?, ?, ?, ?)', [id, input.productId, input.ratePerTon, changedById]);\n    const result = await query('SELECT * FROM rates WHERE id = ?', [id]);\n    return result.rows[0];"
    );
  }

  if (service.includes('work')) {
    content = content.replace(
      /INSERT INTO work_entries \(worker_id, product_id, quantity_tons, rate_used, amount, work_date, recorded_by_id\)\s*VALUES \(\?, \?, \?, \?, \?, \?, \?\)/,
      "const id = uuidv4();\n    await query('INSERT INTO work_entries (id, worker_id, product_id, quantity_tons, rate_used, amount, work_date, recorded_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, input.workerId, input.productId, input.quantityTons, rateUsed, amount, input.workDate, recordedById]);\n    const result = await query('SELECT * FROM work_entries WHERE id = ?', [id]);\n    return result.rows[0];"
    );

    content = content.replace(
      /INSERT INTO work_entries \(worker_id, product_id, quantity_tons, rate_used, amount, work_date, recorded_by_id\)\s*VALUES\s*/,
      "INSERT INTO work_entries (id, worker_id, product_id, quantity_tons, rate_used, amount, work_date, recorded_by_id) VALUES "
    );
    content = content.replace(
      /let valuesString = entries\.map\(\(_, i\) => `\(\\\$\$\{i \* 7 \+ 1\}, \\\$\$\{i \* 7 \+ 2\}, \\\$\$\{i \* 7 \+ 3\}, \\\$\$\{i \* 7 \+ 4\}, \\\$\$\{i \* 7 \+ 5\}, \\\$\$\{i \* 7 \+ 6\}, \\\$\$\{i \* 7 \+ 7\}\)`\)/g,
      "let valuesString = entries.map(() => `(?, ?, ?, ?, ?, ?, ?, ?)`)"
    );
    content = content.replace(
      /entries\.flatMap\(\(e\) => \[\n\s*e\.workerId,\n\s*e\.productId,\n\s*e\.quantityTons,\n\s*e\.rate_used,\n\s*e\.amount,\n\s*input\.workDate,\n\s*recordedById\n\s*\]\)/,
      "entries.flatMap((e) => [uuidv4(), e.workerId, e.productId, e.quantityTons, e.rate_used, e.amount, input.workDate, recordedById])"
    );
  }

  if (service.includes('payments')) {
    content = content.replace(
      /INSERT INTO payments \(worker_id, amount, method, reference, payment_date, remarks, paid_by_id\)\s*VALUES \(\?, \?, \?, \?, \?, \?, \?\)/,
      "const id = uuidv4();\n    await query('INSERT INTO payments (id, worker_id, amount, method, reference, payment_date, remarks, paid_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, input.workerId, input.amount, input.method, input.reference || null, input.paymentDate, input.remarks || null, paidById]);\n    const result = await query('SELECT * FROM payments WHERE id = ?', [id]);\n    return result.rows[0];"
    );
  }

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
