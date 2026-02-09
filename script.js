let scoreA = 0;
let scoreB = 0;
let round = 1;
const totalRounds = 200;
let isRunning = false;

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
  random: () => (Math.random() < 0.5 ? 'Cooperate' : 'Defect'),
  alwaysCooperate: () => 'Cooperate',
  alwaysDefect: () => 'Defect',
  titForTat: (self, opp) => (opp.length === 0 ? 'Cooperate' : opp[opp.length - 1]),
  grudger: (self, opp) => (opp.includes('Defect') ? 'Defect' : 'Cooperate'),
  forgivingTitForTat: (self, opp) => (opp.slice(-2).includes('Defect') ? 'Defect' : 'Cooperate'),
  pavlov: (self, opp) => {
    if (self.length === 0) return 'Cooperate';
    const prev = payoffMatrix[`${self[self.length - 1]},${opp[self.length - 1]}`];
    return prev[0] >= 0
      ? self[self.length - 1]
      : self[self.length - 1] === 'Cooperate'
      ? 'Defect'
      : 'Cooperate';
  },
  friedman: (self, opp) => (opp.includes('Defect') ? 'Defect' : 'Cooperate'),
  feld: (self, opp) => (opp.filter((v) => v === 'Defect').length >= 2 ? 'Defect' : 'Cooperate'),
  nice: () => 'Cooperate',
  nasty: () => 'Defect',
  suspiciousTitForTat: (self, opp) => (opp.length === 0 ? 'Defect' : opp[opp.length - 1]),
  randomTitForTat: (self, opp) => (Math.random() < 0.1 ? 'Defect' : opp.length ? opp[opp.length - 1] : 'Cooperate'),
  reverseTitForTat: (self, opp) =>
    opp.length === 0 ? 'Defect' : opp[opp.length - 1] === 'Cooperate' ? 'Defect' : 'Cooperate'
};

function setApiStatus(message, state = 'neutral') {
  const status = document.getElementById('apiStatus');
  status.textContent = message;
  status.style.color = state === 'ok' ? '#1f9f5a' : state === 'error' ? '#d83a52' : '#5b6472';
}

function getChoice(strategy, selfHistory, oppHistory) {
  return strategies[strategy](selfHistory, oppHistory);
}

function setNatureLabel(labelNode, strategyKey) {
  const type = strategyNature[strategyKey] || 'nice';
  labelNode.textContent = `Behavior: ${type}`;
  labelNode.className = `label-nature ${type}`;
}

function populateStrategyDropdown() {
  const strategyList = Object.keys(strategies);
  const selects = [document.getElementById('strategyA'), document.getElementById('strategyB')];
  const labels = [document.getElementById('labelA'), document.getElementById('labelB')];

  selects.forEach((select, index) => {
    select.innerHTML = '';
    strategyList.forEach((key) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      select.appendChild(opt);
    });

    setNatureLabel(labels[index], select.value);

    select.onchange = () => {
      if (isRunning) return;
      setNatureLabel(labels[index], select.value);
    };
  });
}

function setControlsDisabled(disabled) {
  document.getElementById('strategyA').disabled = disabled;
  document.getElementById('strategyB').disabled = disabled;
  const startBtn = document.getElementById('startBtn');
  startBtn.disabled = disabled;
  startBtn.textContent = disabled ? 'Simulation running…' : 'Run simulation';
}

function resetGame() {
  scoreA = 0;
  scoreB = 0;
  round = 1;
  document.getElementById('roundDetails').innerHTML = '';
  document.getElementById('scoreA').textContent = scoreA;
  document.getElementById('scoreB').textContent = scoreB;
  document.getElementById('round').textContent = round;
  document.getElementById('finalSummary').style.display = 'none';
}

async function saveResults(payload) {
  try {
    const response = await fetch('http://localhost:3000/api/scores/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('save-failed');
    }

    setApiStatus('Result saved to history', 'ok');
  } catch (error) {
    setApiStatus('Could not reach backend. Match still completed.', 'error');
  }
}

function startSimulation() {
  if (isRunning) return;

  isRunning = true;
  setControlsDisabled(true);
  setApiStatus('Simulation in progress…');
  resetGame();

  const stratA = document.getElementById('strategyA').value;
  const stratB = document.getElementById('strategyB').value;
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

    document.getElementById('round').textContent = round;
    document.getElementById('scoreA').textContent = scoreA;
    document.getElementById('scoreB').textContent = scoreB;

    const roundDetails = document.getElementById('roundDetails');
    const entry = document.createElement('div');
    entry.className = 'round-entry';
    entry.innerHTML = `<strong>Round ${round}</strong>: A - ${choiceA}, B - ${choiceB} ⇒ A: ${aPayoff}, B: ${bPayoff}`;
    roundDetails.appendChild(entry);
    roundDetails.scrollTop = roundDetails.scrollHeight;

    if (round < totalRounds) {
      round += 1;
      setTimeout(playRound, 50);
      return;
    }

    const winner = scoreA > scoreB ? 'Player A Wins 🏆' : scoreB > scoreA ? 'Player B Wins 🏆' : 'Draw 🤝';
    const finalMsg = document.createElement('div');
    finalMsg.className = 'round-entry final';
    finalMsg.innerHTML = `<strong>Game Over!</strong><br>Final Score — Player A: ${scoreA}, Player B: ${scoreB}<br><strong>${winner}</strong>`;
    roundDetails.appendChild(finalMsg);
    roundDetails.scrollTop = roundDetails.scrollHeight;

    document.getElementById('finalSummary').style.display = 'block';
    document.getElementById('finalText').textContent = `Player A: ${scoreA} — Player B: ${scoreB} | ${winner}`;

    saveResults({
      playerA: stratA,
      playerB: stratB,
      scoreA,
      scoreB
    }).finally(() => {
      isRunning = false;
      setControlsDisabled(false);
    });
  }

  playRound();
}

populateStrategyDropdown();
