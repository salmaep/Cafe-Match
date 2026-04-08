import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

async function run() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'cafematch',
  });

  await ds.initialize();

  const hash = await bcrypt.hash('password123', 10);

  const cafes = [
    { id: 1, ownerEmail: 'owner.gormeteria@demo.id', ownerName: 'Owner Gormeteria' },
    { id: 2, ownerEmail: 'owner.herbspice@demo.id', ownerName: 'Owner Herb Spice' },
    { id: 3, ownerEmail: 'owner.cremelin@demo.id', ownerName: 'Owner Cremelin' },
    { id: 4, ownerEmail: 'owner.studio69@demo.id', ownerName: 'Owner Studio69' },
    { id: 5, ownerEmail: 'owner.kalika@demo.id', ownerName: 'Owner Kalika' },
    { id: 6, ownerEmail: 'owner.paskal@demo.id', ownerName: 'Owner Paskal' },
  ];

  for (const c of cafes) {
    const [existing] = await ds.query('SELECT id FROM users WHERE email = ?', [c.ownerEmail]);
    let ownerId: number;

    if (existing) {
      ownerId = existing.id;
    } else {
      const res = await ds.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
        [c.ownerEmail, hash, c.ownerName, 'owner'],
      );
      ownerId = res.insertId;
      console.log(`Created user ${c.ownerName} (id=${ownerId})`);
    }

    await ds.query('UPDATE cafes SET owner_id = ? WHERE id = ?', [ownerId, c.id]);
    console.log(`Cafe ${c.id} -> owner ${ownerId} (${c.ownerName})`);
  }

  console.log('\nDone! Olive (id=2) now only owns cafe 100 (Blue Turtle).');
  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
