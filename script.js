let scoreA = 0;
let scoreB = 0;
let round = 1;
let totalRounds = 200;
let isRunning = false;
let seededRandom = null;

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

let payoffMatrix = {
  'Cooperate,Cooperate': [1, 1],
  'Cooperate,Defect': [-3, 0],
  'Defect,Cooperate': [0, -3],
  'Defect,Defect': [-2, -2]
};

const strategies = {
  random: () => (randomUnit() < 0.5 ? 'Cooperate' : 'Defect'),
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
  randomTitForTat: (self, opp) => (randomUnit() < 0.1 ? 'Defect' : opp.length ? opp[opp.length - 1] : 'Cooperate'),
  reverseTitForTat: (self, opp) =>
    opp.length === 0 ? 'Defect' : opp[opp.length - 1] === 'Cooperate' ? 'Defect' : 'Cooperate'
};

function setApiStatus(message, state = 'neutral') {
  const status = document.getElementById('apiStatus');
  status.textContent = message;
  status.style.color = state === 'ok' ? '#1f9f5a' : state === 'error' ? '#d83a52' : '#5b6472';
}

function hashStringToSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}

function createSeededRng(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function randomUnit() {
  return seededRandom ? seededRandom() : Math.random();
}

function getNumericValue(id, fallback = 0) {
  const raw = document.getElementById(id)?.value;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getChoice(strategy, selfHistory, oppHistory, noiseRate, forgivenessRate, mutationRate) {
  let choice = strategies[strategy](selfHistory, oppHistory);

  if (randomUnit() < mutationRate) {
    choice = randomUnit() < 0.5 ? 'Cooperate' : 'Defect';
  }

  if (choice === 'Defect' && randomUnit() < forgivenessRate) {
    choice = 'Cooperate';
  }

  if (randomUnit() < noiseRate) {
    choice = choice === 'Cooperate' ? 'Defect' : 'Cooperate';
  }

  return choice;
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

  buildMixControls(strategyList);
}

function setControlsDisabled(disabled) {
  document.getElementById('strategyA').disabled = disabled;
  document.getElementById('strategyB').disabled = disabled;
  document.getElementById('roundsInput').disabled = disabled;
  document.getElementById('seedInput').disabled = disabled;
  document.getElementById('noiseInput').disabled = disabled;
  document.getElementById('forgivenessInput').disabled = disabled;
  document.getElementById('mutationInput').disabled = disabled;
  document.getElementById('mixAEnabled').disabled = disabled;
  document.getElementById('mixBEnabled').disabled = disabled;
  const mixInputs = document.querySelectorAll('.mix-list input');
  mixInputs.forEach((input) => {
    input.disabled = disabled;
  });
  const payoffInputs = document.querySelectorAll('.matrix-inputs input');
  payoffInputs.forEach((input) => {
    input.disabled = disabled;
  });
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

function readPayoffMatrix() {
  payoffMatrix = {
    'Cooperate,Cooperate': [
      getNumericValue('payoffCC_A', 1),
      getNumericValue('payoffCC_B', 1)
    ],
    'Cooperate,Defect': [
      getNumericValue('payoffCD_A', -3),
      getNumericValue('payoffCD_B', 0)
    ],
    'Defect,Cooperate': [
      getNumericValue('payoffDC_A', 0),
      getNumericValue('payoffDC_B', -3)
    ],
    'Defect,Defect': [
      getNumericValue('payoffDD_A', -2),
      getNumericValue('payoffDD_B', -2)
    ]
  };
}

function normalizeWeights(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (!total) return null;
  return items.map((item) => ({
    key: item.key,
    weight: item.weight / total
  }));
}

function chooseWeighted(items) {
  if (!items || items.length === 0) return null;
  let roll = randomUnit();
  for (let i = 0; i < items.length; i += 1) {
    roll -= items[i].weight;
    if (roll <= 0) return items[i].key;
  }
  return items[items.length - 1].key;
}

function readMixConfig(listId) {
  const list = document.getElementById(listId);
  const rows = list.querySelectorAll('.mix-row');
  const items = [];
  rows.forEach((row) => {
    const checkbox = row.querySelector('input[type=\"checkbox\"]');
    const weightInput = row.querySelector('input[type=\"number\"]');
    if (!checkbox || !weightInput) return;
    if (!checkbox.checked) return;
    items.push({
      key: checkbox.value,
      weight: Math.max(0, Number.parseFloat(weightInput.value) || 0)
    });
  });
  return normalizeWeights(items);
}

function updateRangeValue(inputId, valueId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(valueId);
  if (!input || !label) return;
  label.textContent = `${Math.round(parseFloat(input.value) * 100)}%`;
}

function buildMixControls(strategyList) {
  const lists = [
    document.getElementById('mixAList'),
    document.getElementById('mixBList')
  ];
  lists.forEach((list) => {
    list.innerHTML = '';
    strategyList.forEach((key) => {
      const row = document.createElement('div');
      row.className = 'mix-row';
      row.innerHTML = `
        <label>
          <input type=\"checkbox\" value=\"${key}\" />
          <span>${key}</span>
        </label>
        <input type=\"number\" min=\"0\" max=\"100\" step=\"1\" value=\"0\" />`;
      list.appendChild(row);
    });
  });
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
  readPayoffMatrix();

  const stratA = document.getElementById('strategyA').value;
  const stratB = document.getElementById('strategyB').value;
  totalRounds = Math.max(1, Math.min(1000, Math.floor(getNumericValue('roundsInput', 200))));
  document.getElementById('roundTotal').textContent = totalRounds;
  const seedValue = document.getElementById('seedInput').value.trim();
  seededRandom = seedValue ? createSeededRng(hashStringToSeed(seedValue)) : null;
  const noiseRate = getNumericValue('noiseInput', 0);
  const forgivenessRate = getNumericValue('forgivenessInput', 0);
  const mutationRate = getNumericValue('mutationInput', 0);
  const useMixA = document.getElementById('mixAEnabled').checked;
  const useMixB = document.getElementById('mixBEnabled').checked;
  const mixA = useMixA ? readMixConfig('mixAList') : null;
  const mixB = useMixB ? readMixConfig('mixBList') : null;

  const historyA = [];
  const historyB = [];

  function playRound() {
    const chosenStratA = mixA ? chooseWeighted(mixA) || stratA : stratA;
    const chosenStratB = mixB ? chooseWeighted(mixB) || stratB : stratB;

    const choiceA = getChoice(chosenStratA, historyA, historyB, noiseRate, forgivenessRate, mutationRate);
    const choiceB = getChoice(chosenStratB, historyB, historyA, noiseRate, forgivenessRate, mutationRate);

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
    entry.innerHTML = `<strong>Round ${round}</strong>: A - ${choiceA} (${chosenStratA}), B - ${choiceB} (${chosenStratB}) ⇒ A: ${aPayoff}, B: ${bPayoff}`;
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
      seededRandom = null;
      isRunning = false;
      setControlsDisabled(false);
    });
  }

  playRound();
}

function wireInputs() {
  updateRangeValue('noiseInput', 'noiseValue');
  updateRangeValue('forgivenessInput', 'forgivenessValue');
  updateRangeValue('mutationInput', 'mutationValue');

  document.getElementById('noiseInput').addEventListener('input', () => {
    updateRangeValue('noiseInput', 'noiseValue');
  });
  document.getElementById('forgivenessInput').addEventListener('input', () => {
    updateRangeValue('forgivenessInput', 'forgivenessValue');
  });
  document.getElementById('mutationInput').addEventListener('input', () => {
    updateRangeValue('mutationInput', 'mutationValue');
  });
  document.getElementById('roundsInput').addEventListener('input', (event) => {
    const value = Math.max(1, Math.min(1000, Math.floor(Number.parseFloat(event.target.value) || 1)));
    document.getElementById('roundTotal').textContent = value;
  });
}

populateStrategyDropdown();
wireInputs();
