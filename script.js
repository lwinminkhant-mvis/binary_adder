document.addEventListener('DOMContentLoaded', () => {
  const formatSelect = document.getElementById('formatSelect');
  const numCountSelect = document.getElementById('numCountSelect');
  const levelSelect = document.getElementById('levelSelect');
  const questionCountSelect = document.getElementById('questionCountSelect');
  const startBtn = document.getElementById('startBtn');
  const checkAllBtn = document.getElementById('checkAllBtn');

  const questionsContainer = document.getElementById('questionsContainer');
  const overallFeedback = document.getElementById('overallFeedback');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const scoreStats = document.getElementById('scoreStats');
  const formatBadge = document.getElementById('formatBadge');
  const initialPrompt = document.getElementById('initialPrompt');
  const buttonGroup = document.getElementById('buttonGroup');
  const quizCard = document.getElementById('quizCard');

  let questions = [];
  let answered = [];
  let results = [];
  let score = 0;
  let currentBits = 0;

  function getQuestionCount() {
    return parseInt(questionCountSelect.value, 10);
  }

  // Parse URL parameters and set form values
  function loadSettingsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const format = params.get('format');
    const level = params.get('level');
    const numCount = params.get('numCount');
    const questionCount = params.get('questionCount');

    let allParamsProvided = false;

    if (format && (format === 'binary' || format === 'hexadecimal')) {
      formatSelect.value = format;
      allParamsProvided = true;
    } else {
      allParamsProvided = false;
    }

    if (level && (level === 'easy' || level === 'medium' || level === 'hard')) {
      levelSelect.value = level;
    } else {
      allParamsProvided = false;
    }

    if (numCount && (numCount === '2' || numCount === '3' || numCount === '4')) {
      numCountSelect.value = numCount;
    } else {
      allParamsProvided = false;
    }

    if (questionCount && (questionCount === '5' || questionCount === '10' || questionCount === '15' || questionCount === '20')) {
      questionCountSelect.value = questionCount;
    } else {
      allParamsProvided = false;
    }

    return allParamsProvided && format && level && numCount && questionCount;
  }

  function bitsForLevel(level) {
    if (level === 'easy') return 4;
    if (level === 'medium') return 8;
    return 12;
  }

  function randInt(maxInclusive) {
    return Math.floor(Math.random() * maxInclusive) + 1;
  }

  function generateRound() {
    const count = parseInt(numCountSelect.value, 10);
    const level = levelSelect.value;
    const bits = bitsForLevel(level);
    currentBits = bits;
    const max = (1 << bits) - 1;

    const out = [];
    for (let i = 0; i < getQuestionCount(); i++) {
      const nums = [];
      for (let j = 0; j < count; j++) nums.push(randInt(max));
      out.push(nums);
    }
    return out;
  }

  function formatNumber(n, fmt) {
    if (fmt === 'binary') return n.toString(2).padStart(currentBits, '0');
    if (fmt === 'hexadecimal') return n.toString(16).toUpperCase();
    return n.toString(10);
  }

  function formatQuestion(nums, fmt) {
    return nums.map(n => formatNumber(n, fmt)).join(' + ');
  }

  function hexsum(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    return sum.toString(16).toUpperCase();
  }

  function correctForFormat(nums, fmt) {
    if (fmt === 'hexadecimal') {
      const s = hexsum(nums);
      return { asNumber: parseInt(s, 16), asString: s };
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    const binaryStr = sum.toString(2);
    if (fmt === 'binary') {
      const padWidth = Math.max(currentBits, binaryStr.length);
      return { asNumber: sum, asString: binaryStr.padStart(padWidth, '0') };
    }
    return { asNumber: sum, asString: sum.toString(10) };
  }

  function updateScoreDisplay() {
    scoreDisplay.textContent = `Score: ${score} / ${getQuestionCount()}`;
  }

  function updateFormatBadge() {
    const fmt = formatSelect.value;
    if (fmt === 'binary') {
      formatBadge.textContent = 'BINARY';
      formatBadge.className = 'badge bg-info text-dark';
    } else {
      formatBadge.textContent = 'HEXADECIMAL';
      formatBadge.className = 'badge bg-success text-dark';
    }
  }

  function renderQuestions() {
    questionsContainer.innerHTML = '';
    overallFeedback.innerHTML = '';
    const qCount = getQuestionCount();
    answered = new Array(qCount).fill(false);
    results = new Array(qCount).fill(false);
    score = 0;
    updateScoreDisplay();
    initialPrompt.style.display = 'none';
    scoreStats.style.display = 'block';
    buttonGroup.style.display = 'flex';
    quizCard.style.display = 'block';

    const fmt = formatSelect.value;

    for (let i = 0; i < qCount; i++) {
      const nums = questions[i];
      const qText = formatQuestion(nums, fmt) + ' = ?';

      const item = document.createElement('div');
      item.className = 'list-group-item';
      item.innerHTML = `
        <div class="d-flex align-items-start">
          <div class="me-3">
            <span class="badge ${fmt === 'binary' ? 'bg-info text-dark' : 'bg-success text-dark'}">${fmt === 'binary' ? 'B' : 'H'}</span>
          </div>
          <div class="flex-fill">
            <div class="fw-bold question-text">${qText}</div>
            <div class="mt-2 input-group">
              <input data-index="${i}" class="form-control answer-input" placeholder="${fmt === 'binary' ? 'Answer in Binary' : 'Answer in Hexadecimal'}">
              <button data-index="${i}" class="btn btn-outline-primary check-btn" type="button">Check</button>
            </div>
            <div class="mt-2 feedback"></div>
          </div>
        </div>
      `;

      questionsContainer.appendChild(item);
    }
  }

  function checkQuestion(index) {
    const item = questionsContainer.children[index];
    if (!item) return;
    const input = item.querySelector('.answer-input');
    const fb = item.querySelector('.feedback');
    const user = input.value.trim();
    const fmt = formatSelect.value;
    if (user === '') {
      fb.innerHTML = '<div class="text-warning">Please enter an answer.</div>';
      return;
    }

    let userVal;
    if (fmt === 'binary') {
      if (!/^[01]+$/.test(user.replace(/\s+/g, ''))) {
        fb.innerHTML = '<div class="text-danger">Invalid binary format.</div>';
        return;
      }
      userVal = parseInt(user.replace(/\s+/g, ''), 2);
    } else if (fmt === 'hexadecimal') {
      if (!/^[0-9a-fA-F]+$/.test(user.replace(/\s+/g, ''))) {
        fb.innerHTML = '<div class="text-danger">Invalid hexadecimal format.</div>';
        return;
      }
      userVal = parseInt(user.replace(/\s+/g, ''), 16);
    } else {
      if (!/^\d+$/.test(user.replace(/\s+/g, ''))) {
        fb.innerHTML = '<div class="text-danger">Invalid number format.</div>';
        return;
      }
      userVal = parseInt(user.replace(/\s+/g, ''), 10);
    }

    const nums = questions[index];
    const corr = correctForFormat(nums, fmt);
    if (userVal === corr.asNumber) {
      fb.innerHTML = '<div class="text-success">Correct</div>';
      if (!answered[index]) {
        score += 1;
        updateScoreDisplay();
      }
      results[index] = true;
    } else {
      fb.innerHTML = `<div class="text-danger">Wrong. Correct: <strong>${corr.asString}</strong></div>`;
      results[index] = false;
    }
    answered[index] = true;
    input.disabled = true;
    const checkBtn = item.querySelector('.check-btn');
    if (checkBtn) checkBtn.disabled = true;
  }

  questionsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    if (btn.classList.contains('check-btn')) checkQuestion(idx);
  });

  checkAllBtn.addEventListener('click', () => {
    for (let i = 0; i < getQuestionCount(); i++) {
      const item = questionsContainer.children[i];
      if (!item) continue;
      const input = item.querySelector('.answer-input');
      if (!answered[i]) {
        checkQuestion(i);
      }
    }
    overallFeedback.innerHTML = `<div class="alert alert-info mt-2">Round checked. Score: ${score} / ${getQuestionCount()}</div>`;
  });

  startBtn.addEventListener('click', () => {
    questions = generateRound();
    updateFormatBadge();
    renderQuestions();
  });

  function updateInitialPrompt() {
    const qCount = getQuestionCount();
    initialPrompt.textContent = `Press Start to generate ${qCount} question${qCount !== 1 ? 's' : ''}.`;
  }

  formatSelect.addEventListener('change', () => {
    updateFormatBadge();
    if (questions.length) renderQuestions();
  });

  questionCountSelect.addEventListener('change', () => {
    updateInitialPrompt();
  });

  updateFormatBadge();
  updateInitialPrompt();

  // Load settings from URL and auto-start if all parameters provided
  if (loadSettingsFromURL()) {
    updateFormatBadge();
    updateInitialPrompt();
    setTimeout(() => {
      startBtn.click();
    }, 100);
  }
});
