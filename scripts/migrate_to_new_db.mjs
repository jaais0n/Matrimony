import fs from 'fs';

const newConnStr = process.argv[2] || process.env.NEW_DATABASE_URL;

if (!newConnStr) {
  console.error('Usage: node scripts/migrate_to_new_db.mjs <NEW_POSTGRES_CONNECTION_STRING>');
  process.exit(1);
}

async function migrate() {
  try {
    const url = new URL(newConnStr);
    const endpoint = `https://${url.hostname}/sql`;

    console.log('1. Connecting to new database at:', url.hostname);

    // 1. Create table if not exists
    const createRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': newConnStr,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `CREATE TABLE IF NOT EXISTS pm_store (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Failed to create table in new DB: ${err}`);
    }
    console.log('2. Table pm_store created/verified in new database.');

    // 2. Read backup file
    const backupPath = 'scripts/db_backup.json';
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file scripts/db_backup.json not found!');
    }
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    console.log(`3. Loaded backup: ${backupData.profiles?.length || 0} profiles, ${backupData.users?.length || 0} users.`);

    // 3. Insert into new database
    const insertRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': newConnStr,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `INSERT INTO pm_store (key, data) VALUES ($1, $2::jsonb)
                ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
                RETURNING key;`,
        params: ['store_main', JSON.stringify(backupData)],
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      throw new Error(`Failed to migrate data into new DB: ${err}`);
    }

    console.log('4. Successfully migrated all data into the new Neon database!');

    // 4. Update api/_lib/db-store.js FALLBACK_CONN
    const dbStorePath = 'api/_lib/db-store.js';
    let dbStoreCode = fs.readFileSync(dbStorePath, 'utf-8');
    dbStoreCode = dbStoreCode.replace(
      /const FALLBACK_CONN = '.*?';/,
      `const FALLBACK_CONN = '${newConnStr}';`
    );
    fs.writeFileSync(dbStorePath, dbStoreCode, 'utf-8');
    console.log('5. Updated api/_lib/db-store.js with new connection string.');

    // 5. Update .env if present
    if (fs.existsSync('.env')) {
      let envContent = fs.readFileSync('.env', 'utf-8');
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${newConnStr}"`);
      } else {
        envContent += `\nDATABASE_URL="${newConnStr}"\n`;
      }
      fs.writeFileSync('.env', envContent, 'utf-8');
      console.log('6. Updated .env with new connection string.');
    }

    console.log('\nMigration complete! Everything is 100% restored.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
