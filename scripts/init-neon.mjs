import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = 'postgresql://neondb_owner:npg_DTj86nVbSHRq@ep-old-queen-b3qfwz1n-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const client = new pg.Client({ connectionString });

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  await client.connect();
  console.log('Connected!');

  const schemaPath = resolve(__dirname, '../database/migrations/0001_initial_schema.sql');
  const schemaSql = readFileSync(schemaPath, 'utf8');

  console.log('Applying database schema to Neon...');
  await client.query(schemaSql);
  console.log('Schema successfully applied!');

  // Check table list
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Created tables in Neon:');
  tables.rows.forEach((r) => console.log(' - ' + r.table_name));

  await client.end();
}

main().catch((err) => {
  console.error('Error applying schema:', err);
  process.exit(1);
});
