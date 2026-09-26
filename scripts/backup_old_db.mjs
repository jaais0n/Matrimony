import fs from 'fs';

const connStr = 'postgresql://neondb_owner:npg_DTj86nVbSHRq@ep-old-queen-b3qfwz1n-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const url = new URL(connStr);

async function backup() {
  try {
    const res = await fetch(`https://${url.hostname}/sql`, {
      method: 'POST',
      headers: {
        'Neon-Connection-String': connStr,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'SELECT data FROM pm_store WHERE key = $1',
        params: ['store_main'],
      }),
    });

    const d = await res.json();
    if (d.rows && d.rows[0] && d.rows[0].data) {
      const data = d.rows[0].data;
      console.log('Successfully retrieved old DB data:');
      console.log(' - Profiles:', (data.profiles || []).length);
      console.log(' - Users:', (data.users || []).length);
      console.log(' - Conversations:', (data.conversations || []).length);

      fs.writeFileSync('scripts/db_backup.json', JSON.stringify(data, null, 2), 'utf-8');
      console.log('Saved backup to scripts/db_backup.json');
    } else {
      console.log('Query result:', d);
    }
  } catch (err) {
    console.error('Backup error:', err);
  }
}

backup();
