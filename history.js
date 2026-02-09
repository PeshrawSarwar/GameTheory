function setResultsStatus(message, isError = false) {
  const status = document.getElementById('resultsStatus');
  status.textContent = message;
  status.style.color = isError ? '#d83a52' : '#5b6472';
}

function renderEmptyState(message) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = `<tr><td colspan="6" class="empty">${message}</td></tr>`;
}

async function fetchResults() {
  try {
    const res = await fetch('http://localhost:3000/api/scores/list');
    if (!res.ok) throw new Error('Failed to fetch results');

    const data = await res.json();
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      renderEmptyState('No saved matches yet. Run a simulation first.');
      setResultsStatus('0 matches');
      return;
    }

    data.forEach((row) => {
      const tr = document.createElement('tr');
      const winner = row.side_a_score > row.side_b_score ? 'Player A' : row.side_b_score > row.side_a_score ? 'Player B' : 'Tie';

      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.side_a_algo}</td>
        <td>${row.side_a_score}</td>
        <td>${row.side_b_algo}</td>
        <td>${row.side_b_score}</td>
        <td class="${winner === 'Tie' ? '' : winner === 'Player A' ? 'winner' : 'loser'}">${winner}</td>
      `;

      tbody.appendChild(tr);
    });

    setResultsStatus(`${data.length} matches loaded`);
  } catch (err) {
    renderEmptyState('Could not reach backend API (http://localhost:3000).');
    setResultsStatus('Load failed', true);
    console.error(err);
  }
}

fetchResults();
