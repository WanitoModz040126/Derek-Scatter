// scripts/create-admin.js
// Usage: node scripts/create-admin.js <username> <password>
// Creates the user if it doesn't exist (or promotes it if it does) and
// makes it an admin with a starting balance so you have something to test with.

const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error('Usage: node scripts/create-admin.js <username> <password>');
    process.exit(1);
  }

  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (existing) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
    console.log(`Existing user "${username}" promoted to admin.`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare(
    'INSERT INTO users (username, password_hash, credits, is_admin) VALUES (?, ?, 100000, 1)'
  ).run(username, hash);
  console.log(`Admin account "${username}" created with 100000 starting credits.`);
}

main().then(() => process.exit(0));
