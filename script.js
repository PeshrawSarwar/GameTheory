let scoreA = 0, scoreB = 0, round = 1, totalRounds = 200;
let history = [];

const payoffMatrix = {
  'Cooperate,Cooperate': [1, 1],
  'Cooperate,Defect': [-3, 0],
  'Defect,Cooperate': [0, -3],
  'Defect,Defect': [-2, -2]
};

// Marking algorithms as nice or nasty:
const strategyTypes = {
  random: "nasty",
  alwaysCooperate: "nice",
  alwaysDefect: "nasty",
  titForTat: "nice",
  grudger: "nasty",
  forgivingTitForTat: "nice",
  pavlov: "nice",
  friedman: "nice",
  feld: "nasty",
  randomNoise: "nasty",
  titForTwoTats: "nice",
  hardMajority: "nasty",
  softMajority: "nice",
  detective: "nasty",
  prober: "nasty"
};

const strategies = {
  random: () => Math.random() < 0.5 ? 'Cooperate' : 'Defect',
  alwaysCooperate: () => 'Cooperate',
  alwaysDefect: () => 'Defect',
  titForTat: (self, oppHistory) => oppHistory.length === 0 ? 'Cooperate' : oppHistory[oppHistory.length - 1],
  grudger: (self, oppHistory) => oppHistory.includes('Defect') ? 'Defect' : 'Cooperate',
  forgivingTitForTat: (self, oppHistory) => oppHistory.slice(-2).includes('Defect') ? 'Defect' : 'Cooperate',
  pavlov: (selfHistory, oppHistory) => {
    if (selfHistory.length === 0) return 'Cooperate';
    const prevResult = payoffMatrix[`${selfHistory[selfHistory.length - 1]},${oppHistory[oppHistory.length - 1]}`];
    return (prevResult[0] >= 0) ? selfHistory[selfHistory.length - 1] : selfHistory[selfHistory.length - 1] === 'Cooperate' ? 'Defect' : 'Cooperate';
  },
  friedman: (self, oppHistory) => oppHistory.includes('Defect') ? 'Defect' : 'Cooperate',
  feld: (self, oppHistory) => oppHistory.filter(c => c === 'Defect').length >= 2 ? 'Defect' : 'Cooperate',
  randomNoise: () => Math.random() < 0.3 ? 'Defect' : 'Cooperate',  // more defects, nasty
  titForTwoTats: (self, oppHistory) => {
    if (oppHistory.length < 2) return 'Cooperate';
    return oppHistory.slice(-2).every(move => move === 'Defect') ? 'Defect' : 'Cooperate';
  },
  hardMajority: (self, oppHistory) => {
    if (oppHistory.length === 0) return 'Cooperate';
    const defectCount = oppHistory.filter(m => m === 'Defect').length;
    return defectCount > oppHistory.length / 2 ? 'Defect' : 'Cooperate';
  },
  softMajority: (self, oppHistory) => {
    if (oppHistory.length === 0) return 'Cooperate';
    const defectCount = oppHistory.filter(m => m === 'Defect').length;
    return defectCount >= oppHistory.length / 2 ? 'Defect' : 'Cooperate';
  },
  detective: (self, oppHistory) => {
    // Start with C, D, C, C then react to opponent defecting with defection
    const testMoves = ['Cooperate', 'Defect', 'Cooperate', 'Cooperate'];
    if (self.length < 4) return testMoves[self.length];
    if (oppHistory.includes('Defect')) return 'Defect';
    return 'Cooperate';
  },
  prober: (self, oppHistory) => {
    // First move D, then C, C, then mirror opponent except if opponent defects initially
    if (self.length === 0) return 'Defect';
    if (self.length <= 3) return 'Cooperate';
    if (oppHistory[0] === 'Defect') return 'Defect';
    return oppHistory[self.length - 1];
  }
};

function getChoice(strategy, selfHistory, oppHistory) {
  const fn = strategies[strategy];
  return fn(selfHistory, oppHistory);
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

  // Reset colors
  document.getElementById('scoreA').style.color = "#000";
  document.getElementById('scoreB').style.color = "#000";

  // Hide final score on reset
  document.getElementById('finalScore').hidden = true;
  document.getElementById('winnerText').textContent = '';

  // Reset strategy type colors
  document.getElementById('typeA').className = 'strategy-type';
  document.getElementById('typeB').className = 'strategy-type';
}

function updateSelectedStrategyLabels() {
  const stratA = document.getElementById("strategyA").value;
  const stratB = document.getElementById("strategyB").value;

  const selectedA = document.getElementById("selectedA");
  const selectedB = document.getElementById("selectedB");
  const typeA = document.getElementById("typeA");
  const typeB = document.getElementById("typeB");

  selectedA.textContent = stratA.replace(/([A-Z])/g, ' $1').trim();
  selectedB.textContent = stratB.replace(/([A-Z])/g, ' $1').trim();

  const typeANice = strategyTypes[stratA] === 'nice';
  const typeBNice = strategyTypes[stratB] === 'nice';

  typeA.textContent = typeANice ? 'Nice' : 'Nasty';
  typeB.textContent = typeBNice ? 'Nice' : 'Nasty';

  typeA.className = `strategy-type ${typeANice ? 'nice' : 'nasty'}`;
  typeB.className = `strategy-type ${typeBNice ? 'nice' : 'nasty'}`;
}

function startSimulation() {
  resetGame();

  const stratA = document.getElementById("strategyA").value;
  const stratB = document.getElementById("strategyB").value;

  updateSelectedStrategyLabels();

  const historyA = [];
  const historyB = [];

  function playRound() {
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
    entry.innerHTML = `<strong>Round ${round}</strong>: Player A - ${choiceA}, Player B - ${choiceB} ⇒ A: ${aPayoff}, B: ${bPayoff}`;
    roundDetails.appendChild(entry);
    roundDetails.scrollTop = roundDetails.scrollHeight;

    if (round < totalRounds) {
      round++;
      setTimeout(playRound, 50);
    } else {
      // Show final score at top
      const finalScoreDiv = document.getElementById('finalScore');
      document.getElementById('finalScoreA').textContent = scoreA;
      document.getElementById('finalScoreB').textContent = scoreB;
      finalScoreDiv.hidden = false;

      // Determine winner
      const winnerText = document.getElementById('winnerText');
      const scoreASpan = document.getElementById('scoreA');
      const scoreBSpan = document.getElementById('scoreB');

      if(scoreA > scoreB) {
        winnerText.textContent = "🏆 Player A Wins!";
        winnerText.style.color = "#388e3c";  // green
        scoreASpan.style.color = "#388e3c";
        scoreBSpan.style.color = "#d32f2f";
      } else if(scoreB > scoreA) {
        winnerText.textContent = "🏆 Player B Wins!";
        winnerText.style.color = "#388e3c";  // green
        scoreBSpan.style.color = "#388e3c";
        scoreASpan.style.color = "#d32f2f";
      } else {
        winnerText.textContent = "🤝 It's a Tie!";
        winnerText.style.color = "#555";  // gray
        scoreASpan.style.color = "#555";
        scoreBSpan.style.color = "#555";
      }

      const finalMsg = document.createElement("div");
      finalMsg.className = "round-entry";
      finalMsg.style.backgroundColor = '#c8e6c9';
      finalMsg.innerHTML = `<strong>Game Over!</strong><br>Final Score — Player A: ${scoreA}, Player B: ${scoreB}`;
      roundDetails.appendChild(finalMsg);
      roundDetails.scrollTop = roundDetails.scrollHeight;
    }
  }

  playRound();
}

// Update strategy label/type on select change instantly
document.getElementById("strategyA").addEventListener('change', updateSelectedStrategyLabels);
document.getElementById("strategyB").addEventListener('change', updateSelectedStrategyLabels);

// Initialize labels on load
updateSelectedStrategyLabels();
