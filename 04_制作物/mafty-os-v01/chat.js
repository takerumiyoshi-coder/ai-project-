// ── Debug display ──
function showDebug(msg, isError) {
  var el = document.getElementById('mafty-debug');
  if (!el) return;
  el.textContent = msg;
  el.className = 'mafty-debug ' + (isError ? 'mafty-debug--error' : 'mafty-debug--ok');
  clearTimeout(el._timer);
  el._timer = setTimeout(function () {
    el.textContent = '';
    el.className = 'mafty-debug';
  }, 3000);
}

// ── localStorage utilities ──
function saveHistory(agentId, messages) {
  try {
    localStorage.setItem('maftyos_' + agentId, JSON.stringify(messages));
    showDebug('保存成功：' + agentId, false);
  } catch (e) {
    console.error('maftyos saveHistory error:', agentId, e);
    showDebug('localStorageエラー（保存）：' + e.message, true);
  }
}

function loadHistory(agentId) {
  try {
    var data = JSON.parse(localStorage.getItem('maftyos_' + agentId)) || [];
    showDebug('読み込み成功：' + agentId, false);
    return data;
  } catch (e) {
    console.error('maftyos loadHistory error:', agentId, e);
    showDebug('localStorageエラー（読み込み）：' + e.message, true);
    return [];
  }
}

// ── Time string ──
function getTimeStr() {
  var d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// ── Create a single message element ──
function createMessageEl(msg) {
  var wrapper = document.createElement('div');
  wrapper.className = 'message message--' + msg.role;

  var bubble = document.createElement('div');
  bubble.className = 'message-bubble' + (msg.typing ? ' message-bubble--typing' : '');
  bubble.textContent = msg.text;

  var time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = msg.time || '';

  wrapper.appendChild(bubble);
  if (!msg.typing) wrapper.appendChild(time);
  return wrapper;
}

// ── Render full history for one agent ──
function renderHistory(agentId) {
  var historyEl = document.getElementById('history-' + agentId);
  if (!historyEl) return;

  historyEl.innerHTML = '';
  loadHistory(agentId).forEach(function (msg) {
    historyEl.appendChild(createMessageEl(msg));
  });
  historyEl.scrollTop = historyEl.scrollHeight;
}

// ── Reply function — replace this block for Claude API ──
// To connect Claude API: replace agent.reply(message) with fetch() call
// and pass agent.systemPromptSummary as the system prompt seed.
async function getReply(agentId, message, history) {
  var agent = AGENTS.find(function (a) { return a.id === agentId; });
  if (!agent) return '（エラー：エージェントが見つかりません）';
  return agent.reply(message);
}

// ── Send message ──
async function sendMessage(agentId) {
  var input = document.getElementById('input-' + agentId);
  if (!input) return;

  var text = input.value.trim();
  if (!text) return;

  var historyEl = document.getElementById('history-' + agentId);
  var messages = loadHistory(agentId);

  // Add and render user message
  var userMsg = { role: 'user', text: text, time: getTimeStr() };
  messages.push(userMsg);
  saveHistory(agentId, messages);
  historyEl.appendChild(createMessageEl(userMsg));
  historyEl.scrollTop = historyEl.scrollHeight;

  input.value = '';

  // Typing indicator
  var typingEl = createMessageEl({ role: 'agent', text: '…', typing: true });
  historyEl.appendChild(typingEl);
  historyEl.scrollTop = historyEl.scrollHeight;

  // Simulate processing delay (600–900ms)
  await new Promise(function (resolve) {
    setTimeout(resolve, 600 + Math.floor(Math.random() * 300));
  });

  historyEl.removeChild(typingEl);

  // Add and render agent reply
  var replyText = await getReply(agentId, text, messages);
  var agentMsg = { role: 'agent', text: replyText, time: getTimeStr() };
  messages.push(agentMsg);
  saveHistory(agentId, messages);
  historyEl.appendChild(createMessageEl(agentMsg));
  historyEl.scrollTop = historyEl.scrollHeight;
}

// ── Clear history ──
function clearHistory(agentId) {
  var agent = AGENTS.find(function (a) { return a.id === agentId; });
  var name = agent ? agent.name : agentId;
  if (window.confirm(name + ' の会話履歴をクリアしますか？')) {
    localStorage.removeItem('maftyos_' + agentId);
    renderHistory(agentId);
  }
}

// ── Dashboard utilities ──
function loadDashboard() {
  try {
    var data = localStorage.getItem('maftyos_dashboard');
    return data ? JSON.parse(data) : getDefaultDashboard();
  } catch (e) {
    console.error('loadDashboard error:', e);
    return getDefaultDashboard();
  }
}

function getDefaultDashboard() {
  return {
    todayCommand: '',
    waiting: '',
    later: '',
    oneStep: '',
    projectRunning: '',
    projectHold: '',
    nextMilestone: '',
    maftyStatus: {
      hathaway: '待機中',
      gigi: '待機中',
      iram: '待機中',
      kenneth: '待機中',
      anaheim: '待機中'
    }
  };
}

function saveDashboard(dashData) {
  try {
    localStorage.setItem('maftyos_dashboard', JSON.stringify(dashData));
  } catch (e) {
    console.error('saveDashboard error:', e);
  }
}

function getStatusCycle(currentStatus) {
  var statuses = ['待機中', '作業中', '完了'];
  var idx = statuses.indexOf(currentStatus);
  return statuses[(idx + 1) % statuses.length];
}

function getStatusClass(status) {
  if (status === '作業中') return 'status--working';
  if (status === '完了') return 'status--done';
  return '';
}

function initDashboard() {
  var dashData = loadDashboard();

  // テキストエリアに値を設定
  document.getElementById('dash-today-command').value = dashData.todayCommand || '';
  document.getElementById('dash-waiting').value = dashData.waiting || '';
  document.getElementById('dash-later').value = dashData.later || '';
  document.getElementById('dash-one-step').value = dashData.oneStep || '';
  document.getElementById('dash-project-running').value = dashData.projectRunning || '';
  document.getElementById('dash-project-hold').value = dashData.projectHold || '';
  document.getElementById('dash-next-milestone').value = dashData.nextMilestone || '';

  // ステータスボタンを初期化
  var agents = ['hathaway', 'gigi', 'iram', 'kenneth', 'anaheim'];
  agents.forEach(function (agentId) {
    var status = dashData.maftyStatus[agentId] || '待機中';
    var btn = document.querySelector('.status-btn[data-agent="' + agentId + '"]');
    if (btn) {
      btn.textContent = status;
      btn.className = 'status-btn ' + getStatusClass(status);
    }
  });
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', function () {

  // Initialize dashboard
  initDashboard();

  // Dashboard text inputs - auto save
  var dashTextIds = [
    'dash-today-command', 'dash-waiting', 'dash-later', 'dash-one-step',
    'dash-project-running', 'dash-project-hold', 'dash-next-milestone'
  ];

  dashTextIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', function () {
        var dashData = loadDashboard();
        var keyMap = {
          'dash-today-command': 'todayCommand',
          'dash-waiting': 'waiting',
          'dash-later': 'later',
          'dash-one-step': 'oneStep',
          'dash-project-running': 'projectRunning',
          'dash-project-hold': 'projectHold',
          'dash-next-milestone': 'nextMilestone'
        };
        dashData[keyMap[id]] = el.value;
        saveDashboard(dashData);
      });
      // Also save on blur for better UX
      el.addEventListener('blur', function () {
        var dashData = loadDashboard();
        var keyMap = {
          'dash-today-command': 'todayCommand',
          'dash-waiting': 'waiting',
          'dash-later': 'later',
          'dash-one-step': 'oneStep',
          'dash-project-running': 'projectRunning',
          'dash-project-hold': 'projectHold',
          'dash-next-milestone': 'nextMilestone'
        };
        dashData[keyMap[id]] = el.value;
        saveDashboard(dashData);
      });
    }
  });

  // Dashboard status buttons - toggle status
  document.querySelectorAll('.status-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var agentId = btn.getAttribute('data-agent');
      var dashData = loadDashboard();
      var currentStatus = dashData.maftyStatus[agentId] || '待機中';
      var nextStatus = getStatusCycle(currentStatus);

      dashData.maftyStatus[agentId] = nextStatus;
      saveDashboard(dashData);

      btn.textContent = nextStatus;
      btn.className = 'status-btn ' + getStatusClass(nextStatus);
    });
  });

  // Load all histories
  AGENTS.forEach(function (agent) {
    renderHistory(agent.id);
  });

  // Send buttons
  document.querySelectorAll('.send-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sendMessage(btn.getAttribute('data-agent'));
    });
  });

  // Enter to send / Shift+Enter for newline
  document.querySelectorAll('.chat-input').forEach(function (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.id.replace('input-', ''));
      }
    });
  });

  // Clear buttons
  document.querySelectorAll('.clear-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      clearHistory(btn.getAttribute('data-agent'));
    });
  });

});
