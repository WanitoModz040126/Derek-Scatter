const el = (id) => document.getElementById(id);
const toast = el('toast');

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatNum(n) { return Math.round(n).toLocaleString('en-US'); }

let allUsers = [];

async function loadStats() {
  const res = await fetch('/api/admin/stats');
  if (!res.ok) return;
  const s = await res.json();
  el('statUsers').textContent = formatNum(s.totalUsers);
  el('statCredits').textContent = formatNum(s.totalCredits);
  el('statSpins').textContent = formatNum(s.totalSpins);
  el('statWagered').textContent = formatNum(s.totalWagered);
}

async function loadUsers() {
  const res = await fetch('/api/admin/users');
  if (!res.ok) { window.location.href = '/login.html'; return; }
  const { users } = await res.json();
  allUsers = users;
  renderUsers(allUsers);
}

function renderUsers(users) {
  const tbody = el('userRows');
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  for (const u of users) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(u.username)}</td>
      <td>${u.is_admin ? '<span class="badge admin">Admin</span>' : '<span class="badge player">Player</span>'}</td>
      <td>${u.is_banned ? '<span class="badge banned">Banned</span>' : '—'}</td>
      <td>${formatNum(u.credits)}</td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
      <td>
        <div class="row-actions">
          <input type="number" class="mini-input" placeholder="Amount" id="amt-${u.id}" />
          <button class="btn-mini add" data-mode="add" data-id="${u.id}">+ Add</button>
          <button class="btn-mini set" data-mode="set" data-id="${u.id}">Set To</button>
        </div>
      </td>
      <td>
        <button class="btn-mini ban" data-ban="${u.is_banned ? 0 : 1}" data-id="${u.id}">
          ${u.is_banned ? 'Unban' : 'Ban'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.btn-mini.add, .btn-mini.set').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const mode = btn.dataset.mode;
      const input = el(`amt-${id}`);
      const amount = parseInt(input.value, 10);
      if (!Number.isFinite(amount)) { showToast('Enter a valid amount.'); return; }
      await adjustCredits(id, amount, mode);
      input.value = '';
    });
  });

  tbody.querySelectorAll('.btn-mini.ban').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const banned = btn.dataset.ban === '1';
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, banned }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Action failed.'); return; }
      showToast(banned ? 'User banned.' : 'User unbanned.');
      await loadUsers();
    });
  });
}

async function adjustCredits(userId, amount, mode) {
  try {
    const res = await fetch('/api/admin/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount, mode, reason: 'Manual admin adjustment' }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Could not update credits.'); return; }
    showToast(`Credits ${mode === 'add' ? 'added' : 'set'} for ${data.user.username}.`);
    await loadUsers();
    await loadStats();
  } catch (err) {
    showToast('Connection error.');
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

el('searchBox').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  renderUsers(allUsers.filter((u) => u.username.toLowerCase().includes(q)));
});

el('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

(async function init() {
  await loadStats();
  await loadUsers();
})();
