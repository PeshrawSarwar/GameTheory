let allResults = [];

function setResultsStatus(message, isError = false) {
  const status = document.getElementById('resultsStatus');
  status.textContent = message;
  status.style.color = isError ? '#b65423' : '#5c6a70';
}

function renderEmptyState(message) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="empty">${message}</td></tr>`;
}

function getWinnerLabel(row) {
  const scoreA = Number(row.side_a_score);
  const scoreB = Number(row.side_b_score);
  if (scoreA > scoreB) return 'Player A';
  if (scoreB > scoreA) return 'Player B';
  return 'Tie';
}

function computeStats(rows) {
  const total = rows.length;
  const totals = rows.reduce(
    (acc, row) => {
      const scoreA = Number(row.side_a_score);
      const scoreB = Number(row.side_b_score);
      acc.sumA += Number.isFinite(scoreA) ? scoreA : 0;
      acc.sumB += Number.isFinite(scoreB) ? scoreB : 0;
      const winner = getWinnerLabel(row);
      if (winner === 'Player A') acc.aWins += 1;
      if (winner === 'Player B') acc.bWins += 1;
      if (winner === 'Tie') acc.ties += 1;
      acc.strategyCounts[row.side_a_algo] = (acc.strategyCounts[row.side_a_algo] || 0) + 1;
      acc.strategyCounts[row.side_b_algo] = (acc.strategyCounts[row.side_b_algo] || 0) + 1;
      return acc;
    },
    { sumA: 0, sumB: 0, aWins: 0, bWins: 0, ties: 0, strategyCounts: {} }
  );

  const avgA = total ? (totals.sumA / total).toFixed(1) : '0';
  const avgB = total ? (totals.sumB / total).toFixed(1) : '0';

  const outcomePairs = [
    { label: 'Player A', count: totals.aWins },
    { label: 'Player B', count: totals.bWins },
    { label: 'Tie', count: totals.ties },
  ];

  outcomePairs.sort((a, b) => b.count - a.count);
  const dominant = total ? outcomePairs[0] : { label: '—', count: 0 };
  const dominantText = total ? `${dominant.label} (${Math.round((dominant.count / total) * 100)}%)` : '—';

  let topStrategy = '—';
  let topCount = 0;
  Object.entries(totals.strategyCounts).forEach(([name, count]) => {
    if (count > topCount) {
      topStrategy = name;
      topCount = count;
    }
  });

  document.getElementById('totalMatches').textContent = total.toString();
  document.getElementById('avgAScore').textContent = avgA;
  document.getElementById('avgBScore').textContent = avgB;
  document.getElementById('dominantOutcome').textContent = dominantText;
  document.getElementById('topStrategy').textContent = total ? `Most common strategy: ${topStrategy}` : 'No matches yet.';
}

function renderTable(rows) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (!rows.length) {
    renderEmptyState('No matches match your filters.');
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const winner = getWinnerLabel(row);
    const winnerClass = winner === 'Player A' ? 'winner' : winner === 'Player B' ? 'loser' : '';
    const badgeClass = winner === 'Player A' ? 'result-a' : winner === 'Player B' ? 'result-b' : 'result-tie';

    tr.innerHTML = `
      <td>${row.id}</td>
      <td><span class="chip">${row.side_a_algo}</span></td>
      <td class="score ${winner === 'Player A' ? 'winner' : ''}">${row.side_a_score}</td>
      <td><span class="chip">${row.side_b_algo}</span></td>
      <td class="score ${winner === 'Player B' ? 'winner' : ''}">${row.side_b_score}</td>
      <td class="${winnerClass}"><span class="result-badge ${badgeClass}">${winner}</span></td>
    `;

    tbody.appendChild(tr);
  });
}

function applyFilters() {
  const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
  const winnerFilter = document.getElementById('winnerFilter').value;

  return allResults.filter((row) => {
    const winner = getWinnerLabel(row);
    const matchesWinner =
      winnerFilter === 'all' ||
      (winnerFilter === 'a' && winner === 'Player A') ||
      (winnerFilter === 'b' && winner === 'Player B') ||
      (winnerFilter === 'tie' && winner === 'Tie');

    if (!matchesWinner) return false;

    if (!searchValue) return true;

    const haystack = `${row.id} ${row.side_a_algo} ${row.side_b_algo}`.toLowerCase();
    return haystack.includes(searchValue);
  });
}

function renderFilteredResults() {
  const filtered = applyFilters();
  renderTable(filtered);

  const summary = allResults.length === filtered.length
    ? `${filtered.length} matches loaded`
    : `${filtered.length} of ${allResults.length} matches`;
  setResultsStatus(summary);
}

async function fetchResults() {
  try {
    setResultsStatus('Loading…');
    const res = await fetch('http://localhost:3000/api/scores/list');
    if (!res.ok) throw new Error('Failed to fetch results');

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      allResults = [];
      renderEmptyState('No saved matches yet. Run a simulation first.');
      computeStats([]);
      setResultsStatus('0 matches');
      return;
    }

    allResults = data;
    computeStats(allResults);
    renderFilteredResults();
  } catch (err) {
    allResults = [];
    renderEmptyState('Could not reach backend API (http://localhost:3000).');
    computeStats([]);
    setResultsStatus('Load failed', true);
    console.error(err);
  }
}

document.getElementById('searchInput').addEventListener('input', renderFilteredResults);
document.getElementById('winnerFilter').addEventListener('change', renderFilteredResults);
document.getElementById('refreshBtn').addEventListener('click', fetchResults);

fetchResults();
