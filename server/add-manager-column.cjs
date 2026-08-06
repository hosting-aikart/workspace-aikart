const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      'ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "managerId" TEXT',
    );
    console.log('Added managerId column to Project table.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
