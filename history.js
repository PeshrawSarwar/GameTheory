async function fetchResults() {
    try {
      const res = await fetch('http://localhost:3000/api/scores/list');
      if (!res.ok) throw new Error('Failed to fetch results');
  
      const data = await res.json();
  
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';
  
      data.forEach(row => {
        const tr = document.createElement('tr');
  
        const winner =
          row.side_a_score < row.side_b_score
            ? 'Player A'
            : row.side_a_score > row.side_b_score
            ? 'Player B'
            : 'Tie';
  
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
    } catch (err) {
      console.error(err);
    }
  }
  
  // Call on page load
  fetchResults();
  