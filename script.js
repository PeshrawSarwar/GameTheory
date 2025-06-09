// script.js
let scoreA = 0, scoreB = 0, round = 1, totalRounds = 200;
let history = [];

const strategyNature = {
    random: 'nasty',
    alwaysCooperate: 'nice',
    alwaysDefect: 'nasty',
    titForTat: 'nice',
    grudger: 'nice',
    forgivingTitForTat: 'nice',
    pavlov: 'nice',
    friedman: 'nasty',
    feld: 'nice',
    nice: 'nice',
    nasty: 'nasty',
    suspiciousTitForTat: 'nasty',
    randomTitForTat: 'nasty',
    reverseTitForTat: 'nasty'
  };
  

const payoffMatrix = {
  'Cooperate,Cooperate': [1, 1],
  'Cooperate,Defect': [-3, 0],
  'Defect,Cooperate': [0, -3],
  'Defect,Defect': [-2, -2]
};

const strategies = {
  random: () => Math.random() < 0.5 ? 'Cooperate' : 'Defect',
  alwaysCooperate: () => 'Cooperate',
  alwaysDefect: () => 'Defect',
  titForTat: (self, opp) => opp.length === 0 ? 'Cooperate' : opp[opp.length - 1],
  grudger: (self, opp) => opp.includes('Defect') ? 'Defect' : 'Cooperate',
  forgivingTitForTat: (self, opp) => opp.slice(-2).includes('Defect') ? 'Defect' : 'Cooperate',
  pavlov: (self, opp) => {
    if (self.length === 0) return 'Cooperate';
    const prev = payoffMatrix[`${self[self.length - 1]},${opp[self.length - 1]}`];
    return prev[0] >= 0 ? self[self.length - 1] : self[self.length - 1] === 'Cooperate' ? 'Defect' : 'Cooperate';
  },
  friedman: (self, opp) => opp.includes('Defect') ? 'Defect' : 'Cooperate',
  feld: (self, opp) => opp.filter(v => v === 'Defect').length >= 2 ? 'Defect' : 'Cooperate',
  nice: () => 'Cooperate',
  nasty: () => 'Defect',
  suspiciousTitForTat: (self, opp) => opp.length === 0 ? 'Defect' : opp[opp.length - 1],
  randomTitForTat: (self, opp) => Math.random() < 0.1 ? 'Defect' : (opp.length ? opp[opp.length - 1] : 'Cooperate'),
  reverseTitForTat: (self, opp) => opp.length === 0 ? 'Defect' : opp[opp.length - 1] === 'Cooperate' ? 'Defect' : 'Cooperate'
};

function getChoice(strategy, selfHistory, oppHistory) {
  const fn = strategies[strategy];
  return fn(selfHistory, oppHistory);
}

function populateStrategyDropdown() {
    const strategyList = Object.keys(strategies);
    const selects = [document.getElementById("strategyA"), document.getElementById("strategyB")];
    const labels = [document.getElementById("labelA"), document.getElementById("labelB")];
  
    selects.forEach((select, index) => {
      select.innerHTML = '';
      strategyList.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        select.appendChild(opt);
      });
  
      // Initial load label
      const selected = select.value;
      const type = strategyNature[selected];
      labels[index].textContent = `Type: ${type}`;
      labels[index].className = `label-nature ${type}`;
  
      // Update on change
      select.onchange = () => {
        const selected = select.value;
        const type = strategyNature[selected];
        labels[index].textContent = `Type: ${type}`;
        labels[index].className = `label-nature ${type}`;
      };
    });
  }
  

function resetGame() {
  scoreA = 0;
  scoreB = 0;
  round = 1;
  history = [];
  document.getElementById("roundDetails").innerHTML = '';
  document.getElementById("scoreA").textContent = scoreA;
  document.getElementById("scoreB").textContent = scoreB;
  document.getElementById("round").textContent = round;
}

function startSimulation() {
    resetGame();
    const stratA = document.getElementById("strategyA").value;
    const stratB = document.getElementById("strategyB").value;
    const historyA = [], historyB = [];

  
    async function playRound() {
      const choiceA = getChoice(stratA, historyA, historyB);
      const choiceB = getChoice(stratB, historyB, historyA);
  
      historyA.push(choiceA);
      historyB.push(choiceB);
  
      const key = `${choiceA},${choiceB}`;
      const [aPayoff, bPayoff] = payoffMatrix[key];
  
      scoreA += aPayoff;
      scoreB += bPayoff;
  
      document.getElementById("round").textContent = round;
      document.getElementById("scoreA").textContent = scoreA;
      document.getElementById("scoreB").textContent = scoreB;
  
      const roundDetails = document.getElementById("roundDetails");
      const entry = document.createElement("div");
      entry.className = "round-entry";
      entry.innerHTML = `<strong>Round ${round}</strong>: A - ${choiceA}, B - ${choiceB} ⇒ A: ${aPayoff}, B: ${bPayoff}`;
      roundDetails.appendChild(entry);
      roundDetails.scrollTop = roundDetails.scrollHeight;
  

  
      if (round < totalRounds) {
        round++;
        setTimeout(playRound, 50);
      } else {
        // Display final results
        const finalMsg = document.createElement("div");
        finalMsg.className = "round-entry";
        finalMsg.style.backgroundColor = '#c8e6c9';
        const winner = scoreA > scoreB ? 'Player A Wins 🏆' : scoreB > scoreA ? 'Player B Wins 🏆' : 'Draw 🤝';
        finalMsg.innerHTML = `<strong>Game Over!</strong><br>Final Score — Player A: ${scoreA}, Player B: ${scoreB}<br><strong>${winner}</strong>`;
        roundDetails.appendChild(finalMsg);
        roundDetails.scrollTop = roundDetails.scrollHeight;

        document.getElementById("finalSummary").style.display = 'block';
        document.getElementById("finalText").textContent = `Player A: ${scoreA} — Player B: ${scoreB} | ${winner}`;



        console.log(`Starting simulation with strategies: A - ${stratA}, B - ${stratB}`);
  
        // ✅ Send final summary to backend
        await fetch('http://localhost:3000/api/scores/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerA: stratA,
            playerB: stratB,
            scoreA: scoreA,
            scoreB: scoreB
          })
        });
      }
    }
  
    playRound();
}
  

populateStrategyDropdown();
