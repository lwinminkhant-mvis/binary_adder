document.addEventListener('DOMContentLoaded', () => {
  const QUESTIONS_PER_ROUND = 10;

  const formatSelect = document.getElementById('formatSelect');
  const numCountSelect = document.getElementById('numCountSelect');
  const levelSelect = document.getElementById('levelSelect');
  const startBtn = document.getElementById('startBtn');
  const newRoundBtn = document.getElementById('newRoundBtn');
  const resetBtn = document.getElementById('resetBtn');
  const checkAllBtn = document.getElementById('checkAllBtn');
  const revealAllBtn = document.getElementById('revealAllBtn');

  const questionsContainer = document.getElementById('questionsContainer');
  const overallFeedback = document.getElementById('overallFeedback');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const qCountDisplay = document.getElementById('qCountDisplay');
  const formatBadge = document.getElementById('formatBadge');

  let questions = [];
  let answered = new Array(QUESTIONS_PER_ROUND).fill(false);
  let results = new Array(QUESTIONS_PER_ROUND).fill(false);
  let score = 0;

  function bitsForLevel(level) {
    if (level === 'easy') return 4;
    if (level === 'medium') return 8;
    return 12;
  }

  function randInt(maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive + 1));
  }

  function generateRound() {
    const count = parseInt(numCountSelect.value, 10);
    const level = levelSelect.value;
    const bits = bitsForLevel(level);
    const max = (1 << bits) - 1;

    const out = [];
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const nums = [];
      for (let j = 0; j < count; j++) nums.push(randInt(max));
      out.push(nums);
    }
    return out;
  }

  function formatNumber(n, fmt) {
    if (fmt === 'binary') return n.toString(2);
    return n.toString(10);
  }

  function formatQuestion(nums, fmt) {
    return nums.map(n => formatNumber(n, fmt)).join(' + ');
  }

  function dismalAdd(nums) {
    const strs = nums.map(n => n.toString(10));
    const maxLen = Math.max(...strs.map(s => s.length));
    const padded = strs.map(s => s.padStart(maxLen, '0'));
    let res = '';
    for (let i = 0; i < maxLen; i++) {
      let maxd = 0;
      for (let s of padded) {
        const d = parseInt(s[i], 10);
        if (d > maxd) maxd = d;
      }
      res += String(maxd);
    }
    res = res.replace(/^0+(?!$)/, '');
    return res;
  }

  function correctForFormat(nums, fmt) {
    if (fmt === 'dismal') {
      const s = dismalAdd(nums);
      return { asNumber: parseInt(s, 10), asString: s };
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    return { asNumber: sum, asString: sum.toString(fmt === 'binary' ? 2 : 10) };
  }

  function updateScoreDisplay() {
    scoreDisplay.textContent = `Score: ${score} / ${QUESTIONS_PER_ROUND}`;
  }

  function updateFormatBadge() {
    const fmt = formatSelect.value;
    if (fmt === 'binary') {
      formatBadge.textContent = 'BINARY';
      formatBadge.className = 'badge bg-info text-dark';
    } else {
      formatBadge.textContent = 'DISMAL';
      formatBadge.className = 'badge bg-warning text-dark';
    }
  }

  function renderQuestions() {
    questionsContainer.innerHTML = '';
    overallFeedback.innerHTML = '';
    answered = new Array(QUESTIONS_PER_ROUND).fill(false);
    results = new Array(QUESTIONS_PER_ROUND).fill(false);
    score = 0;
    updateScoreDisplay();
    qCountDisplay.textContent = `Questions: ${QUESTIONS_PER_ROUND} / ${QUESTIONS_PER_ROUND}`;

    const fmt = formatSelect.value;

    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const nums = questions[i];
      const qText = formatQuestion(nums, fmt) + ' = ?';

      const item = document.createElement('div');
      item.className = 'list-group-item';
      item.innerHTML = `
        <div class="d-flex align-items-start">
          <div class="me-3">
            <span class="badge ${fmt === 'binary' ? 'bg-info text-dark' : 'bg-warning text-dark'}">${fmt === 'binary' ? 'B' : 'D'}</span>
          </div>
          <div class="flex-fill">
            <div class="fw-bold question-text">${qText}</div>
            <div class="mt-2 input-group">
              <input data-index="${i}" class="form-control answer-input" placeholder="Answer">
              <button data-index="${i}" class="btn btn-outline-primary check-btn" type="button">Check</button>
              <button data-index="${i}" class="btn btn-outline-secondary reveal-btn" type="button">Reveal</button>
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

  function revealQuestion(index) {
    const item = questionsContainer.children[index];
    if (!item) return;
    const fb = item.querySelector('.feedback');
    const nums = questions[index];
    const corr = correctForFormat(nums, formatSelect.value);
    fb.innerHTML = `<div class="text-secondary">Answer: <strong>${corr.asString}</strong></div>`;
    if (!answered[index]) {
      answered[index] = true;
      results[index] = false;
    }
    const input = item.querySelector('.answer-input');
    input.disabled = true;
    const checkBtn = item.querySelector('.check-btn');
    if (checkBtn) checkBtn.disabled = true;
  }

  questionsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    if (btn.classList.contains('check-btn')) checkQuestion(idx);
    if (btn.classList.contains('reveal-btn')) revealQuestion(idx);
  });

  checkAllBtn.addEventListener('click', () => {
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const item = questionsContainer.children[i];
      if (!item) continue;
      const input = item.querySelector('.answer-input');
      if (!answered[i]) {
        checkQuestion(i);
      }
    }
    overallFeedback.innerHTML = `<div class="alert alert-info mt-2">Round checked. Score: ${score} / ${QUESTIONS_PER_ROUND}</div>`;
  });

  revealAllBtn.addEventListener('click', () => {
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) revealQuestion(i);
    overallFeedback.innerHTML = `<div class="alert alert-secondary mt-2">All answers revealed.</div>`;
  });

  startBtn.addEventListener('click', () => {
    questions = generateRound();
    updateFormatBadge();
    renderQuestions();
  });

  newRoundBtn.addEventListener('click', () => {
    questions = generateRound();
    updateFormatBadge();
    renderQuestions();
  });

  resetBtn.addEventListener('click', () => {
    questions = [];
    questionsContainer.innerHTML = '';
    overallFeedback.innerHTML = '';
    score = 0;
    updateScoreDisplay();
    qCountDisplay.textContent = `Questions: 0 / ${QUESTIONS_PER_ROUND}`;
    updateFormatBadge();
  });

  formatSelect.addEventListener('change', () => {
    updateFormatBadge();
    if (questions.length) renderQuestions();
  });

  updateFormatBadge();
});
