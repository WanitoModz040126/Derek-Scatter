(function () {
  const reelGrid = document.getElementById('reelGrid');
  const creditsAmount = document.getElementById('creditsAmount');
  const usernameTag = document.getElementById('usernameTag');
  const betAmount = document.getElementById('betAmount');
  const betMinus = document.getElementById('betMinus');
  const betPlus = document.getElementById('betPlus');
  const spinBtn = document.getElementById('spinBtn');
  const bonusBtn = document.getElementById('bonusBtn');
  const winBanner = document.getElementById('winBanner');
  const freeSpinBanner = document.getElementById('freeSpinBanner');
  const gameError = document.getElementById('gameError');
  const logoutLink = document.getElementById('logoutLink');

  const BET_STEPS = [1, 2, 5, 10, 20, 50, 100];
  let betIndex = 0;

  let cols = 6;
  let rows = 5;
  let symbolMap = {}; // id -> file
  let freeSpinsRemaining = 0;
  let spinning = false;

  async function boot() {
    const cfgRes = await fetch('/api/config');
    const cfg = await cfgRes.json();
    cols = cfg.grid.cols;
    rows = cfg.grid.rows;
    cfg.symbols.forEach((s) => (symbolMap[s.id] = s.file));
    reelGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    reelGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const meRes = await fetch('/api/me');
    if (!meRes.ok) {
      window.location.href = '/login.html';
      return;
    }
    const me = await meRes.json();
    applyUser(me.user);
    renderEmptyGrid();
  }

  function applyUser(user) {
    usernameTag.textContent = user.username;
    creditsAmount.textContent = formatNum(user.credits);
    freeSpinsRemaining = user.freeSpinsRemaining || 0;
    updateFreeSpinBanner();
  }

  function formatNum(n) {
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function updateFreeSpinBanner() {
    if (freeSpinsRemaining > 0) {
      freeSpinBanner.textContent = `Free Spins Remaining: ${freeSpinsRemaining}`;
      freeSpinBanner.classList.add('show');
    } else {
      freeSpinBanner.classList.remove('show');
    }
  }

  function cellId(c, r) {
    return `cell-${c}-${r}`;
  }

  function renderEmptyGrid() {
    reelGrid.innerHTML = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const div = document.createElement('div');
        div.className = 'medallion';
        div.id = cellId(c, r);
        reelGrid.appendChild(div);
      }
    }
  }

  function setCell(c, r, symbolId, { winning = false, scatter = false, drop = false } = {}) {
    const el = document.getElementById(cellId(c, r));
    if (!el) return;
    el.className = 'medallion' + (winning ? ' win' : '') + (scatter ? ' scatter-symbol' : '') + (drop ? ' dropping' : '');
    const file = symbolMap[symbolId];
    el.innerHTML = file ? `<img src="/assets/icons/${file}" alt="" />` : '';
  }

  function renderStaticGrid(grid) {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        setCell(c, r, grid[c][r]);
      }
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function playSteps(steps) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const winningSet = new Set(step.winningCells.map(({ c, r }) => `${c},${r}`));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const isWinning = winningSet.has(`${c},${r}`);
          const symId = step.grid[c][r];
          setCell(c, r, symId, {
            winning: isWinning,
            scatter: symId === 'circle_scatter',
            drop: i > 0,
          });
        }
      }
      if (step.stepWin > 0) {
        winBanner.textContent = `Win  ${formatNum(step.stepWin)}  (x${step.multiplier})`;
        winBanner.classList.add('show');
      }
      await sleep(step.winningCells.length > 0 ? 750 : 450);
    }
  }

  async function spin() {
    if (spinning) return;
    spinning = true;
    gameError.textContent = '';
    winBanner.classList.remove('show');
    spinBtn.disabled = true;
    bonusBtn.disabled = true;

    const bet = BET_STEPS[betIndex];

    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();
      if (!res.ok) {
        gameError.textContent = data.error || 'Spin failed.';
        spinning = false;
        spinBtn.disabled = false;
        bonusBtn.disabled = false;
        return;
      }

      await playSteps(data.steps);

      if (data.scatter?.hit) {
        winBanner.textContent = `Guardian Medallions x${data.scatter.scatterCount}! +${data.scatter.hit.freeSpins} Free Spins`;
        winBanner.classList.add('show');
        await sleep(1200);
      }

      applyUser(data.user);
    } catch (err) {
      gameError.textContent = 'Connection problem. Try again.';
    }

    spinning = false;
    spinBtn.disabled = false;
    bonusBtn.disabled = false;
  }

  betMinus.addEventListener('click', () => {
    betIndex = Math.max(0, betIndex - 1);
    betAmount.textContent = BET_STEPS[betIndex];
  });
  betPlus.addEventListener('click', () => {
    betIndex = Math.min(BET_STEPS.length - 1, betIndex + 1);
    betAmount.textContent = BET_STEPS[betIndex];
  });

  spinBtn.addEventListener('click', spin);

  bonusBtn.addEventListener('click', async () => {
    gameError.textContent = '';
    bonusBtn.disabled = true;
    try {
      const res = await fetch('/api/bonus/claim', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        gameError.textContent = data.error || 'Bonus not available yet.';
      } else {
        applyUser(data.user);
      }
    } catch (err) {
      gameError.textContent = 'Connection problem. Try again.';
    }
    bonusBtn.disabled = false;
  });

  logoutLink.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  boot();
})();
