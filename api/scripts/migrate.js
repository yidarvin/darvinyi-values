const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
  await pool.query(sql);

  // Remove duplicate values_list rows caused by repeated seeding without a unique constraint,
  // keeping the row with the lowest id for each original_order.
  await pool.query(`
    DELETE FROM values_list
    WHERE id NOT IN (
      SELECT MIN(id) FROM values_list GROUP BY original_order
    )
  `);

  // Add unique constraint if it doesn't already exist.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'values_list_original_order_key'
      ) THEN
        ALTER TABLE values_list ADD CONSTRAINT values_list_original_order_key UNIQUE (original_order);
      END IF;
    END
    $$
  `);

  console.log('Migration complete');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
