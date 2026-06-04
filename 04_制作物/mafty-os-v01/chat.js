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

// ── EXPORT LOG ──
function loadExportSelection() {
  var defaults = { dashboard: true, gigiTasks: true, hathaway: true, gigi: true, iram: true, kenneth: true, anaheim: true };
  try {
    var saved = JSON.parse(localStorage.getItem('maftyos_export_selection'));
    return saved ? Object.assign(defaults, saved) : defaults;
  } catch (e) {
    return defaults;
  }
}

function saveExportSelection(sel) {
  try {
    localStorage.setItem('maftyos_export_selection', JSON.stringify(sel));
  } catch (e) {
    console.error('saveExportSelection error:', e);
  }
}

function exportLog(sel) {
  if (!sel) sel = loadExportSelection();
  var allKeys = ['dashboard', 'gigiTasks', 'hathaway', 'gigi', 'iram', 'kenneth', 'anaheim'];
  var hasAny = allKeys.some(function (k) { return sel[k]; });
  if (!hasAny) {
    alert('選択された項目がありません');
    return;
  }

  var now = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var dateStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var hhmm = pad(now.getHours()) + pad(now.getMinutes());
  var filename = 'mafty-log-' + dateStr + '-' + hhmm + '.md';

  function readRaw(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
  }

  var lines = [];

  // ── ヘッダー
  lines.push('# MAFTY OS — 指令ログ');
  lines.push('エクスポート日時：' + dateStr + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()));
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── ダッシュボード
  if (sel.dashboard) {
    var dash = readRaw('maftyos_dashboard') || getDefaultDashboard();

    lines.push('## TODAY\'S COMMAND');
    lines.push('**今日やること：** ' + (dash.todayCommand || '（未入力）'));
    lines.push('**確認待ち：** ' + (dash.waiting || '（未入力）'));
    lines.push('**今やらなくていいこと：** ' + (dash.later || '（未入力）'));
    lines.push('**今日の一手：** ' + (dash.oneStep || '（未入力）'));
    lines.push('');

    lines.push('## PROJECT STATUS');
    lines.push('**進行中：** ' + (dash.projectRunning || '（未入力）'));
    lines.push('**保留：** ' + (dash.projectHold || '（未入力）'));
    lines.push('**次のマイルストーン：** ' + (dash.nextMilestone || '（未入力）'));
    lines.push('');

    lines.push('## MAFTY STATUS');
    var agentLabels = [
      ['hathaway', 'ハサウェイ'],
      ['gigi',     'ギギ'],
      ['iram',     'イラム'],
      ['kenneth',  'ケネス'],
      ['anaheim',  'アナハイム']
    ];
    agentLabels.forEach(function (pair) {
      lines.push('- ' + pair[1] + '：' + ((dash.maftyStatus && dash.maftyStatus[pair[0]]) || '待機中'));
    });
    lines.push('');
  }

  // ── GIGI TASK BOARD
  if (sel.gigiTasks) {
    lines.push('## GIGI TASK BOARD');
    var tasks = readRaw('maftyos_gigi_tasks') || [];
    if (tasks.length === 0) {
      lines.push('（タスクなし）');
    } else {
      tasks.forEach(function (t) {
        lines.push('- [' + t.status + '] ' + t.text);
      });
    }
    lines.push('');
  }

  // ── 会話履歴セパレーター
  var hasAgents = sel.hathaway || sel.gigi || sel.iram || sel.kenneth || sel.anaheim;
  if (hasAgents) {
    lines.push('---');
    lines.push('');
  }

  // ── 会話履歴
  var agentMeta = [
    { id: 'hathaway', name: 'ハサウェイ・ノア',   key: 'hathaway' },
    { id: 'gigi',     name: 'ギギ・アンダルシア', key: 'gigi' },
    { id: 'iram',     name: 'イラム',             key: 'iram' },
    { id: 'kenneth',  name: 'ケネス・スレッグ',   key: 'kenneth' },
    { id: 'anaheim',  name: 'アナハイム',         key: 'anaheim' }
  ];

  agentMeta.forEach(function (agent) {
    if (!sel[agent.key]) return;
    lines.push('## ' + agent.name + ' との会話');
    var history = readRaw('maftyos_' + agent.id) || [];
    if (history.length === 0) {
      lines.push('（履歴なし）');
    } else {
      history.forEach(function (msg) {
        var who = msg.role === 'user' ? 'たける' : agent.name;
        var time = msg.time ? '[' + msg.time + '] ' : '';
        lines.push('**' + time + who + '：** ' + msg.text);
      });
    }
    lines.push('');
  });

  // ── ダウンロード
  var blob = new Blob([lines.join('\n')], { type: 'text/markdown; charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showDebug('エクスポート完了：' + filename, false);
}

// ── GIGI TASK BOARD ──
function loadGigiTasks() {
  try {
    return JSON.parse(localStorage.getItem('maftyos_gigi_tasks')) || [];
  } catch (e) {
    return [];
  }
}

function saveGigiTasks(tasks) {
  try {
    localStorage.setItem('maftyos_gigi_tasks', JSON.stringify(tasks));
  } catch (e) {
    console.error('saveGigiTasks error:', e);
  }
}

function addGigiTask(text) {
  if (!text.trim()) return;
  var tasks = loadGigiTasks();
  tasks.push({ id: Date.now(), text: text.trim(), status: '未着手' });
  saveGigiTasks(tasks);
  renderGigiTasks();
}

function updateGigiTaskStatus(id) {
  var statuses = ['未着手', '作業中', '完了'];
  var tasks = loadGigiTasks().map(function (t) {
    if (t.id === id) {
      var idx = statuses.indexOf(t.status);
      t.status = statuses[(idx + 1) % statuses.length];
    }
    return t;
  });
  saveGigiTasks(tasks);
  renderGigiTasks();
}

function deleteGigiTask(id) {
  saveGigiTasks(loadGigiTasks().filter(function (t) { return t.id !== id; }));
  renderGigiTasks();
}

function getTaskStatusClass(status) {
  if (status === '作業中') return 'task-status--working';
  if (status === '完了') return 'task-status--done';
  return '';
}

function renderGigiTasks() {
  var list = document.getElementById('gigi-task-list');
  if (!list) return;
  var tasks = loadGigiTasks();
  list.innerHTML = '';
  if (tasks.length === 0) {
    var empty = document.createElement('p');
    empty.className = 'gigi-tasks-empty';
    empty.textContent = 'タスクはありません';
    list.appendChild(empty);
    return;
  }
  tasks.forEach(function (task) {
    var item = document.createElement('div');
    item.className = 'gigi-task-item';

    var statusBtn = document.createElement('button');
    statusBtn.className = 'task-status-btn ' + getTaskStatusClass(task.status);
    statusBtn.textContent = task.status;
    statusBtn.addEventListener('click', function () { updateGigiTaskStatus(task.id); });

    var textEl = document.createElement('span');
    textEl.className = 'gigi-task-text' + (task.status === '完了' ? ' gigi-task-text--done' : '');
    textEl.textContent = task.text;

    var delBtn = document.createElement('button');
    delBtn.className = 'gigi-task-delete-btn';
    delBtn.textContent = '削除';
    delBtn.addEventListener('click', function () { deleteGigiTask(task.id); });

    item.appendChild(statusBtn);
    item.appendChild(textEl);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', function () {

  // EXPORT DROPDOWN
  (function () {
    var dropdown = document.getElementById('export-dropdown');
    var btn      = document.getElementById('export-btn');
    var panel    = document.getElementById('export-panel');
    var runBtn   = document.getElementById('export-run-btn');
    if (!btn || !panel) return;

    var checkDefs = [
      { id: 'exp-dashboard', key: 'dashboard' },
      { id: 'exp-gigiTasks', key: 'gigiTasks' },
      { id: 'exp-hathaway',  key: 'hathaway' },
      { id: 'exp-gigi',      key: 'gigi' },
      { id: 'exp-iram',      key: 'iram' },
      { id: 'exp-kenneth',   key: 'kenneth' },
      { id: 'exp-anaheim',   key: 'anaheim' }
    ];

    // localStorageから選択状態を復元
    var sel = loadExportSelection();
    checkDefs.forEach(function (def) {
      var cb = document.getElementById(def.id);
      if (cb) cb.checked = sel[def.key] !== false;
    });

    // ドロップダウン開閉
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = panel.classList.toggle('export-panel--open');
      btn.classList.toggle('export-btn--open', isOpen);
    });

    // チェック変更時にlocalStorage保存
    checkDefs.forEach(function (def) {
      var cb = document.getElementById(def.id);
      if (!cb) return;
      cb.addEventListener('change', function () {
        var s = loadExportSelection();
        s[def.key] = cb.checked;
        saveExportSelection(s);
      });
    });

    // エクスポート実行
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        exportLog(loadExportSelection());
        panel.classList.remove('export-panel--open');
        btn.classList.remove('export-btn--open');
      });
    }

    // パネル外クリックで閉じる
    document.addEventListener('click', function (e) {
      if (dropdown && !dropdown.contains(e.target)) {
        panel.classList.remove('export-panel--open');
        btn.classList.remove('export-btn--open');
      }
    });
  })();

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

  // GIGI TASK BOARD
  renderGigiTasks();
  var gigiInput = document.getElementById('gigi-task-input');
  var gigiAddBtn = document.getElementById('gigi-task-add-btn');
  if (gigiInput && gigiAddBtn) {
    gigiAddBtn.addEventListener('click', function () {
      addGigiTask(gigiInput.value);
      gigiInput.value = '';
    });
    gigiInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addGigiTask(gigiInput.value);
        gigiInput.value = '';
      }
    });
  }

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
