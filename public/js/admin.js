(function () {
  const usersBody = document.getElementById('usersBody');
  const emptyState = document.getElementById('emptyState');
  const adminError = document.getElementById('adminError');
  const refreshBtn = document.getElementById('refreshBtn');
  const statCards = document.getElementById('statCards');
  const logoutLink = document.getElementById('logoutLink');

  function fmt(n) {
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function renderStats(users) {
    const totalPlayers = users.length;
    const totalSpins = users.reduce((s, u) => s + u.spins, 0);
    const totalCredits = users.reduce((s, u) => s + u.credits, 0);
    statCards.innerHTML = '';
    const cards = [
      { label: 'Players', value: totalPlayers },
      { label: 'Total Spins', value: fmt(totalSpins) },
      { label: 'Credits In Circulation', value: fmt(totalCredits) },
    ];
    cards.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'panel stat-card';
      div.innerHTML = `<div class="label">${c.label}</div><div class="value">${c.value}</div>`;
      statCards.appendChild(div);
    });
  }

  async function load() {
    adminError.textContent = '';
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (res.status === 403) {
        adminError.textContent = 'This account is not an admin.';
        return;
      }
      const data = await res.json();
      renderStats(data.users);
      usersBody.innerHTML = '';
      if (data.users.length === 0) {
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
        data.users.forEach((u) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.username}</td>
            <td class="credits-col">${fmt(u.credits)}</td>
            <td>${u.spins}</td>
            <td>${fmt(u.totalWagered)}</td>
            <td>${fmt(u.totalWon)}</td>
            <td>${new Date(u.createdAt).toLocaleDateString()}</td>
          `;
          usersBody.appendChild(tr);
        });
      }
    } catch (err) {
      adminError.textContent = 'Could not reach the server.';
    }
  }

  refreshBtn.addEventListener('click', load);
  logoutLink.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  load();
})();
