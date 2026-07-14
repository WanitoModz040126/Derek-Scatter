// gameEngine.js — original scatter-pays cascade logic.
// This is an independent design (own weights, own payout curve, own
// cascade-multiplier rule) — not a copy of any commercial title's math.

const config = require('./symbols.json');

const { cols, rows } = config.grid;
const PAY_SYMBOLS = config.symbols.filter((s) => s.tier !== 'scatter');
const SCATTER = config.symbols.find((s) => s.tier === 'scatter');
const TOTAL_WEIGHT = config.symbols.reduce((sum, s) => sum + s.weight, 0);

function weightedRandomSymbol() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const sym of config.symbols) {
    r -= sym.weight;
    if (r <= 0) return sym.id;
  }
  return config.symbols[config.symbols.length - 1].id;
}

function freshGrid() {
  const grid = [];
  for (let c = 0; c < cols; c++) {
    const col = [];
    for (let r = 0; r < rows; r++) col.push(weightedRandomSymbol());
    grid.push(col);
  }
  return grid; // grid[col][row]
}

function countSymbols(grid) {
  const counts = {};
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const id = grid[c][r];
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
}

function payoutForCount(tier, count) {
  const table = config.payouts[tier];
  const thresholds = Object.keys(table).map(Number).sort((a, b) => a - b);
  let best = 0;
  for (const t of thresholds) {
    if (count >= t) best = table[t];
  }
  return best;
}

// Evaluate one static grid: returns { winningCells: [{c,r}], winAmount (in bet units), matchedIds }
function evaluateGrid(grid, bet) {
  const counts = countSymbols(grid);
  const winningCells = [];
  const matchedIds = [];
  let winAmount = 0;

  for (const sym of PAY_SYMBOLS) {
    const count = counts[sym.id] || 0;
    if (count >= 8) {
      const mult = payoutForCount(sym.tier, count);
      winAmount += mult * bet;
      matchedIds.push({ id: sym.id, count, mult });
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (grid[c][r] === sym.id) winningCells.push({ c, r });
        }
      }
    }
  }

  return { winningCells, winAmount, matchedIds };
}

function scatterResult(grid) {
  const counts = countSymbols(grid);
  const scatterCount = counts[SCATTER.id] || 0;
  const tiers = Object.keys(config.scatter).map(Number).sort((a, b) => a - b);
  let hit = null;
  for (const t of tiers) {
    if (scatterCount >= t) hit = config.scatter[t];
  }
  return { scatterCount, hit };
}

function dropAndRefill(grid, winningCells) {
  const toRemove = new Set(winningCells.map(({ c, r }) => `${c},${r}`));
  const newGrid = [];
  for (let c = 0; c < cols; c++) {
    const survivors = [];
    for (let r = 0; r < rows; r++) {
      if (!toRemove.has(`${c},${r}`)) survivors.push(grid[c][r]);
    }
    const missing = rows - survivors.length;
    const fresh = [];
    for (let i = 0; i < missing; i++) fresh.push(weightedRandomSymbol());
    newGrid.push([...fresh, ...survivors]);
  }
  return newGrid;
}

// Runs one full spin: initial grid + cascades until no more wins.
// Returns { steps: [...], totalWin, scatter: {scatterCount, hit} }
function runSpin(bet) {
  let grid = freshGrid();
  const steps = [];
  let cascadeLevel = 0;
  let totalWin = 0;

  // Scatter is only evaluated on the very first drop of the spin,
  // matching how most cascade slots handle bonus triggers.
  const scatter = scatterResult(grid);

  while (true) {
    const { winningCells, winAmount, matchedIds } = evaluateGrid(grid, bet);
    const multiplier = Math.min(
      1 + cascadeLevel * config.cascade.multiplierStep,
      config.cascade.maxMultiplier
    );
    const steppedWin = winAmount * multiplier;

    steps.push({
      grid: grid.map((col) => [...col]),
      winningCells,
      matchedIds,
      multiplier,
      stepWin: Number(steppedWin.toFixed(4)),
    });

    if (winningCells.length === 0) break;

    totalWin += steppedWin;
    grid = dropAndRefill(grid, winningCells);
    cascadeLevel += 1;

    // safety valve — extremely unlikely to ever trigger, just avoids
    // infinite loops in a pathological RNG streak
    if (cascadeLevel > 30) break;
  }

  return { steps, totalWin: Number(totalWin.toFixed(4)), scatter };
}

module.exports = { runSpin, config };
