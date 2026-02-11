let scoreA = 0;
let scoreB = 0;
let round = 1;
let totalRounds = 200;
let speedMs = 50;
let isRunning = false;
let isPaused = false;
let pendingTimeout = null;
let seededRandom = null;
let activeState = null;

const SETTINGS_KEY = 'pd-simulator-settings-v2';

const defaultSettings = {
  rounds: 200,
  speed: 50,
  seed: '',
  noise: 0,
  forgiveness: 0,
  mutation: 0,
  payoff: {
    CC: [1, 1],
    CD: [-3, 0],
    DC: [0, -3],
    DD: [-2, -2]
  },
  mixAEnabled: false,
  mixBEnabled: false,
  mixA: [],
  mixB: []
};

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

function getNumericValue(id, fallback = 0) {
  const raw = document.getElementById(id)?.value;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
      row.dataset.key = key;
      row.innerHTML = `
        <label>
          <input type="checkbox" value="${key}" />
          <span>${key}</span>
        </label>
        <input type="number" min="0" max="100" step="1" value="0" />`;
      list.appendChild(row);
    });
  });
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
      maybeAutoSave();
    };
  });

  buildMixControls(strategyList);
}

function setControlsDisabled(disabled) {
  const inputIds = [
    'strategyA',
    'strategyB',
    'roundsInput',
    'seedInput',
    'noiseInput',
    'forgivenessInput',
    'mutationInput',
    'speedInput',
    'mixAEnabled',
    'mixBEnabled',
    'autoSaveToggle',
    'saveSettingsBtn',
    'resetSettingsBtn'
  ];

  inputIds.forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.disabled = disabled;
  });

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

function setActionButtons() {
  const pauseBtn = document.getElementById('pauseBtn');
  const stepBtn = document.getElementById('stepBtn');

  if (!pauseBtn || !stepBtn) return;

  pauseBtn.disabled = !isRunning;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  stepBtn.disabled = !isRunning || !isPaused;
}

function resetGame() {
  scoreA = 0;
  scoreB = 0;
  round = 1;
  document.getElementById('roundDetails').innerHTML = '';
  document.getElementById('scoreA').textContent = scoreA;
  document.getElementById('scoreB').textContent = scoreB;
  document.getElementById('round').textContent = round;
  updateProgress(0);
  document.getElementById('finalSummary').style.display = 'none';
}

function updateProgress(currentRound) {
  const progress = document.querySelector('.round-progress');
  const valueLabel = document.getElementById('progressValue');
  if (!progress) return;
  const clampedRound = Math.max(0, Math.min(currentRound, totalRounds));
  const percent = totalRounds ? (clampedRound / totalRounds) * 100 : 0;
  progress.style.setProperty('--progress', `${percent}`);
  if (valueLabel) valueLabel.textContent = `${Math.round(percent)}%`;
  progress.setAttribute('aria-valuenow', String(clampedRound));
}

function updateRoundTotalDisplay(value) {
  const totalLabel = document.getElementById('roundTotal');
  const progress = document.querySelector('.round-progress');
  if (totalLabel) totalLabel.textContent = value;
  if (progress) progress.setAttribute('aria-valuemax', String(value));
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
    const checkbox = row.querySelector('input[type="checkbox"]');
    const weightInput = row.querySelector('input[type="number"]');
    if (!checkbox || !weightInput) return;
    if (!checkbox.checked) return;
    items.push({
      key: checkbox.value,
      weight: Math.max(0, Number.parseFloat(weightInput.value) || 0)
    });
  });
  return normalizeWeights(items);
}

function collectMixSettings(listId) {
  const list = document.getElementById(listId);
  const rows = list.querySelectorAll('.mix-row');
  const result = [];
  rows.forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const weightInput = row.querySelector('input[type="number"]');
    if (!checkbox || !weightInput) return;
    result.push({
      key: checkbox.value,
      enabled: checkbox.checked,
      weight: Number.parseFloat(weightInput.value) || 0
    });
  });
  return result;
}

function applyMixSettings(listId, mixSettings) {
  if (!Array.isArray(mixSettings)) return;
  const list = document.getElementById(listId);
  const rows = list.querySelectorAll('.mix-row');
  rows.forEach((row) => {
    const key = row.dataset.key;
    const match = mixSettings.find((item) => item.key === key);
    const checkbox = row.querySelector('input[type="checkbox"]');
    const weightInput = row.querySelector('input[type="number"]');
    if (!checkbox || !weightInput || !match) return;
    checkbox.checked = Boolean(match.enabled);
    weightInput.value = Number.isFinite(match.weight) ? match.weight : 0;
  });
}

function collectSettings() {
  return {
    rounds: clampNumber(Math.floor(getNumericValue('roundsInput', 200)), 1, 1000),
    speed: clampNumber(Math.floor(getNumericValue('speedInput', 50)), 0, 200),
    seed: document.getElementById('seedInput').value.trim(),
    noise: clampNumber(getNumericValue('noiseInput', 0), 0, 1),
    forgiveness: clampNumber(getNumericValue('forgivenessInput', 0), 0, 1),
    mutation: clampNumber(getNumericValue('mutationInput', 0), 0, 1),
    payoff: {
      CC: [getNumericValue('payoffCC_A', 1), getNumericValue('payoffCC_B', 1)],
      CD: [getNumericValue('payoffCD_A', -3), getNumericValue('payoffCD_B', 0)],
      DC: [getNumericValue('payoffDC_A', 0), getNumericValue('payoffDC_B', -3)],
      DD: [getNumericValue('payoffDD_A', -2), getNumericValue('payoffDD_B', -2)]
    },
    mixAEnabled: document.getElementById('mixAEnabled').checked,
    mixBEnabled: document.getElementById('mixBEnabled').checked,
    mixA: collectMixSettings('mixAList'),
    mixB: collectMixSettings('mixBList')
  };
}

function applySettings(settings) {
  const safe = settings || defaultSettings;
  document.getElementById('roundsInput').value = safe.rounds ?? defaultSettings.rounds;
  document.getElementById('speedInput').value = safe.speed ?? defaultSettings.speed;
  document.getElementById('seedInput').value = safe.seed ?? '';
  document.getElementById('noiseInput').value = safe.noise ?? 0;
  document.getElementById('forgivenessInput').value = safe.forgiveness ?? 0;
  document.getElementById('mutationInput').value = safe.mutation ?? 0;

  const payoff = safe.payoff || defaultSettings.payoff;
  document.getElementById('payoffCC_A').value = payoff.CC?.[0] ?? 1;
  document.getElementById('payoffCC_B').value = payoff.CC?.[1] ?? 1;
  document.getElementById('payoffCD_A').value = payoff.CD?.[0] ?? -3;
  document.getElementById('payoffCD_B').value = payoff.CD?.[1] ?? 0;
  document.getElementById('payoffDC_A').value = payoff.DC?.[0] ?? 0;
  document.getElementById('payoffDC_B').value = payoff.DC?.[1] ?? -3;
  document.getElementById('payoffDD_A').value = payoff.DD?.[0] ?? -2;
  document.getElementById('payoffDD_B').value = payoff.DD?.[1] ?? -2;

  document.getElementById('mixAEnabled').checked = Boolean(safe.mixAEnabled);
  document.getElementById('mixBEnabled').checked = Boolean(safe.mixBEnabled);
  applyMixSettings('mixAList', safe.mixA);
  applyMixSettings('mixBList', safe.mixB);

  updateRangeValue('noiseInput', 'noiseValue');
  updateRangeValue('forgivenessInput', 'forgivenessValue');
  updateRangeValue('mutationInput', 'mutationValue');
  updateRangeValue('speedInput', 'speedValue', 'ms');
  updateRoundTotalDisplay(document.getElementById('roundsInput').value);
}

function saveSettings() {
  const settings = collectSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (!isRunning) {
    setApiStatus('Settings saved', 'ok');
  }
}

function loadSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    applySettings(parsed);
  } catch (error) {
    localStorage.removeItem(SETTINGS_KEY);
  }
}

function resetDefaults() {
  applySettings(defaultSettings);
  localStorage.removeItem(SETTINGS_KEY);
  if (!isRunning) {
    setApiStatus('Defaults restored', 'ok');
  }
}

function maybeAutoSave() {
  const autoSave = document.getElementById('autoSaveToggle');
  if (autoSave && autoSave.checked) {
    saveSettings();
  }
}

function updateRangeValue(inputId, valueId, suffix = '%') {
  const input = document.getElementById(inputId);
  const label = document.getElementById(valueId);
  if (!input || !label) return;
  const value = parseFloat(input.value);
  if (Number.isNaN(value)) return;
  const display = suffix === '%'
    ? `${Math.round(value * 100)}${suffix}`
    : `${Math.round(value)} ${suffix}`;
  label.textContent = display;
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

function advanceRound(state) {
  const { stratA, stratB, historyA, historyB, noiseRate, forgivenessRate, mutationRate, mixA, mixB } = state;
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
  updateProgress(round);

  const roundDetails = document.getElementById('roundDetails');
  const entry = document.createElement('div');
  entry.className = 'round-entry';
  entry.innerHTML = `
    <div class="round-card">
      <div class="round-card__header">
        <span class="round-chip">Round ${round}</span>
        <span class="round-score">A: ${aPayoff} · B: ${bPayoff}</span>
      </div>
      <div class="round-card__body">
        <div class="round-line">
          <span class="player-tag">Player A</span>
          <span class="choice">${choiceA}</span>
          <span class="meta">(${chosenStratA})</span>
        </div>
        <div class="round-line">
          <span class="player-tag">Player B</span>
          <span class="choice">${choiceB}</span>
          <span class="meta">(${chosenStratB})</span>
        </div>
      </div>
    </div>
  `;
  roundDetails.appendChild(entry);
  roundDetails.scrollTop = roundDetails.scrollHeight;

  if (round < totalRounds) {
    round += 1;
    return true;
  }

  finishSimulation(state);
  return false;
}

function finishSimulation(state) {
  const { stratA, stratB } = state;
  const winner = scoreA > scoreB ? 'Player A Wins 🏆' : scoreB > scoreA ? 'Player B Wins 🏆' : 'Draw 🤝';
  const roundDetails = document.getElementById('roundDetails');
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
    isPaused = false;
    pendingTimeout = null;
    activeState = null;
    setControlsDisabled(false);
    setActionButtons();
  });
}

function scheduleNextRound(state) {
  if (!isRunning || isPaused) return;
  pendingTimeout = setTimeout(() => {
    if (advanceRound(state)) {
      scheduleNextRound(state);
    }
  }, speedMs);
}

function startSimulation() {
  if (isRunning) return;

  isRunning = true;
  isPaused = false;
  setActionButtons();
  setControlsDisabled(true);
  setApiStatus('Simulation in progress…');
  resetGame();
  readPayoffMatrix();

  const stratA = document.getElementById('strategyA').value;
  const stratB = document.getElementById('strategyB').value;
  totalRounds = clampNumber(Math.floor(getNumericValue('roundsInput', 200)), 1, 1000);
  speedMs = clampNumber(Math.floor(getNumericValue('speedInput', 50)), 0, 200);
  updateRoundTotalDisplay(totalRounds);

  const seedValue = document.getElementById('seedInput').value.trim();
  seededRandom = seedValue ? createSeededRng(hashStringToSeed(seedValue)) : null;

  const noiseRate = clampNumber(getNumericValue('noiseInput', 0), 0, 1);
  const forgivenessRate = clampNumber(getNumericValue('forgivenessInput', 0), 0, 1);
  const mutationRate = clampNumber(getNumericValue('mutationInput', 0), 0, 1);

  const useMixA = document.getElementById('mixAEnabled').checked;
  const useMixB = document.getElementById('mixBEnabled').checked;
  const mixA = useMixA ? readMixConfig('mixAList') : null;
  const mixB = useMixB ? readMixConfig('mixBList') : null;

  activeState = {
    stratA,
    stratB,
    historyA: [],
    historyB: [],
    noiseRate,
    forgivenessRate,
    mutationRate,
    mixA,
    mixB
  };

  if (advanceRound(activeState)) {
    scheduleNextRound(activeState);
  }
}

function togglePause() {
  if (!isRunning) return;
  isPaused = !isPaused;
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
  setActionButtons();
  if (!isPaused && activeState) {
    setApiStatus('Simulation in progress…');
    scheduleNextRound(activeState);
  } else {
    setApiStatus('Simulation paused');
  }
}

function stepRound() {
  if (!isRunning || !isPaused || !activeState) return;
  if (advanceRound(activeState)) {
    setActionButtons();
  }
}

function wireInputs() {
  updateRangeValue('noiseInput', 'noiseValue');
  updateRangeValue('forgivenessInput', 'forgivenessValue');
  updateRangeValue('mutationInput', 'mutationValue');
  updateRangeValue('speedInput', 'speedValue', 'ms');
  updateRoundTotalDisplay(document.getElementById('roundsInput').value);

  document.getElementById('noiseInput').addEventListener('input', () => {
    updateRangeValue('noiseInput', 'noiseValue');
    maybeAutoSave();
  });
  document.getElementById('forgivenessInput').addEventListener('input', () => {
    updateRangeValue('forgivenessInput', 'forgivenessValue');
    maybeAutoSave();
  });
  document.getElementById('mutationInput').addEventListener('input', () => {
    updateRangeValue('mutationInput', 'mutationValue');
    maybeAutoSave();
  });
  document.getElementById('speedInput').addEventListener('input', () => {
    updateRangeValue('speedInput', 'speedValue', 'ms');
    maybeAutoSave();
  });
  document.getElementById('roundsInput').addEventListener('input', (event) => {
    const value = clampNumber(Math.floor(Number.parseFloat(event.target.value) || 1), 1, 1000);
    updateRoundTotalDisplay(value);
    maybeAutoSave();
  });
  document.getElementById('seedInput').addEventListener('input', maybeAutoSave);
  document.getElementById('mixAEnabled').addEventListener('change', maybeAutoSave);
  document.getElementById('mixBEnabled').addEventListener('change', maybeAutoSave);

  document.getElementById('mixAList').addEventListener('input', maybeAutoSave);
  document.getElementById('mixBList').addEventListener('input', maybeAutoSave);

  const payoffInputs = document.querySelectorAll('.matrix-inputs input');
  payoffInputs.forEach((input) => {
    input.addEventListener('input', maybeAutoSave);
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('resetSettingsBtn').addEventListener('click', resetDefaults);
}

function initialize() {
  populateStrategyDropdown();
  applySettings(defaultSettings);
  loadSettings();
  wireInputs();
  setActionButtons();
}

initialize();
