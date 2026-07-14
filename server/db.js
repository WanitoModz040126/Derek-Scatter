// db.js — minimal JSON file datastore.
// No native bindings (no better-sqlite3 / node-gyp) so it installs cleanly
// everywhere, including Railway's build environment.
//
// NOTE: Railway's default filesystem is ephemeral across redeploys.
// For a hobby/for-fun project this is fine. If you want data to survive
// redeploys, attach a Railway Volume and point DB_PATH at a file inside it.

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'db.json');

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], nextId: 1 }, null, 2));
  }
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // corrupted file safety net — start fresh rather than crash the server
    const fresh = { users: [], nextId: 1 };
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

// Very small write queue so concurrent requests don't clobber each other.
let writeChain = Promise.resolve();
function writeDb(data) {
  writeChain = writeChain.then(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  });
  return writeChain;
}

function findUserByUsername(username) {
  const db = readDb();
  return db.users.find(
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
}

function findUserById(id) {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

function createUser(user) {
  const db = readDb();
  const newUser = {
    id: db.nextId,
    username: user.username,
    passwordHash: user.passwordHash,
    isAdmin: !!user.isAdmin,
    credits: user.credits ?? 0,
    createdAt: new Date().toISOString(),
    lastBonusAt: null,
    stats: { spins: 0, totalWagered: 0, totalWon: 0 },
  };
  db.users.push(newUser);
  db.nextId += 1;
  writeDb(db);
  return newUser;
}

function updateUser(id, patch) {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...patch };
  writeDb(db);
  return db.users[idx];
}

function listUsers() {
  const db = readDb();
  return db.users;
}

module.exports = {
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  listUsers,
};
