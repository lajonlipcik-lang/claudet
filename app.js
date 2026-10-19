const STORAGE_KEYS = {
  project: 'claudet.project.v1',
  settings: 'claudet.settings.v1',
  history: 'claudet.history.v1'
};

const defaultProject = {
  projectName: 'Claudet Demo',
  aiSummary: 'Готов к генерации и локальному деплою.',
  files: {
    'index.html': {
      name: 'index.html',
      content: `<!doctype html><html><head><meta charset="UTF-8"><style>body{background:#0b0b0b;color:#f4f1ee;font-family:Inter,sans-serif;padding:32px}h1{font-family:Georgia,serif;font-size:56px}p{color:#d7d3ce;font-size:18px}button{padding:12px 18px;border-radius:999px;background:#121212;color:#fff;border:none}</style></head><body><h1>Claudet</h1><p>Темная редакторская тема, быстрый AI-workflow и локальный режим.</p><button>Сгенерировать</button></body></html>`
    },
    'styles.css': {
      name: 'styles.css',
      content: 'body { background: #0b0b0b; color: #f4f1ee; font-family: Inter, sans-serif; }'
    },
    'script.js': {
      name: 'script.js',
      content: 'console.log("Claudet ready")'
    }
  }
};

const state = {
  project: loadProject(),
  settings: loadSettings(),
  history: loadHistory(),
  selectedFile: 'index.html',
  activeTab: 'preview',
  chat: []
};

const ui = {
  chatList: document.getElementById('chatList'),
  promptInput: document.getElementById('promptInput'),
  contextChips: document.getElementById('contextChips'),
  generateBtn: document.getElementById('generateBtn'),
  fileList: document.getElementById('fileList'),
  explorerTree: document.getElementById('explorerTree'),
  editorTextarea: document.getElementById('editorTextarea'),
  previewFrame: document.getElementById('previewFrame'),
  selectedFileName: document.getElementById('selectedFileName'),
  runtimeBadge: document.getElementById('runtimeBadge'),
  projectBadge: document.getElementById('projectBadge'),
  statFiles: document.getElementById('statFiles'),
  statVersions: document.getElementById('statVersions'),
  statusPill: document.getElementById('statusPill'),
  aiOverview: document.getElementById('aiOverview'),
  settingsModal: document.getElementById('settingsModal')
};

function loadProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.project);
    return raw ? JSON.parse(raw) : structuredClone(defaultProject);
  } catch {
    return structuredClone(defaultProject);
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProject() {
  localStorage.setItem(STORAGE_KEYS.project, JSON.stringify(state.project));
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function addMessage(role, text, logs = []) {
  state.chat.push({ role, text, logs });
  renderChat();
}

function renderChat() {
  ui.chatList.innerHTML = '';
  state.chat.forEach((message) => {
    const el = document.createElement('div');
    el.className = `message ${message.role}`;
    el.innerHTML = `
      <div class="message-label">${message.role === 'user' ? 'Вы' : 'Claudet AI'}</div>
      <p>${message.text}</p>
      ${message.logs && message.logs.length ? `<div style="margin-top:8px; font-size:12px; opacity:0.8; line-height:1.7;">${message.logs.map(log => `• ${log}`).join('<br>')}</div>` : ''}
    `;
    ui.chatList.appendChild(el);
  });
}

function renderFileList() {
  ui.fileList.innerHTML = '';
  ui.explorerTree.innerHTML = '';

  Object.keys(state.project.files).forEach((key) => {
    const file = state.project.files[key];
    const active = key === state.selectedFile;

    const listItem = document.createElement('button');
    listItem.type = 'button';
    listItem.className = `file-item ${active ? 'active' : ''}`;
    listItem.innerHTML = `<span>${file.name}</span><span style="font-size:10px; color:#9a958f;">${file.name.split('.').pop()}</span>`;
    listItem.addEventListener('click', () => {
      state.selectedFile = key;
      renderAll();
    });
    ui.fileList.appendChild(listItem);

    const explorerItem = document.createElement('button');
    explorerItem.type = 'button';
    explorerItem.className = `file-item ${active ? 'active' : ''}`;
    explorerItem.innerHTML = `<span>${file.name}</span><span style="font-size:10px; color:#9a958f;">${file.name.split('.').pop()}</span>`;
    explorerItem.addEventListener('click', () => {
      state.selectedFile = key;
      renderAll();
    });
    ui.explorerTree.appendChild(explorerItem);
  });

  ui.selectedFileName.textContent = state.selectedFile;
}

function renderEditor() {
  const file = state.project.files[state.selectedFile];
  if (file) ui.editorTextarea.value = file.content;
}

function renderOverview() {
  ui.projectBadge.textContent = state.project.projectName;
  ui.statFiles.textContent = Object.keys(state.project.files).length;
  ui.statVersions.textContent = state.history.length + 1;
  ui.aiOverview.textContent = state.project.aiSummary;
  ui.statusPill.textContent = state.settings.grokKey ? 'xAI / Grok' : 'Локальный';
  ui.runtimeBadge.textContent = state.settings.grokKey ? 'xAI live mode' : 'Локальный режим';
}

function renderPreview() {
  const html = state.project.files['index.html']?.content || '<html><body>Empty</body></html>';
  const css = state.project.files['styles.css']?.content || '';
  const js = state.project.files['script.js']?.content || '';
  const bodyHtml = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] || html;

  const doc = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${css}</style>
      </head>
      <body>
        ${bodyHtml}
        <script>
          try {
            ${js}
          } catch (e) {
            parent.postMessage({ type: 'preview-error', message: e.message }, '*');
          }
        <\/script>
      </body>
    </html>
  `;

  ui.previewFrame.srcdoc = doc;
}

function setTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  document.getElementById('previewTab').classList.toggle('hidden', tabName !== 'preview');
  document.getElementById('editorTab').classList.toggle('hidden', tabName !== 'editor');
  document.getElementById('explorerTab').classList.toggle('hidden', tabName !== 'explorer');
}

function renderAll() {
  renderChat();
  renderFileList();
  renderEditor();
  renderOverview();
  renderPreview();
  setTab(state.activeTab);
}

function populateSettingsModal() {
  document.getElementById('grokKey').value = state.settings.grokKey || '';
  document.getElementById('grokModel').value = state.settings.grokModel || 'grok-beta';
  document.getElementById('cfWorkers').value = state.settings.cfWorkers || '';
  document.getElementById('cfPages').value = state.settings.cfPages || '';
  document.getElementById('cfR2').value = state.settings.cfR2 || '';
  document.getElementById('supabaseUrl').value = state.settings.supabaseUrl || '';
  document.getElementById('dbUrl').value = state.settings.dbUrl || '';
}

function saveSettingsFromModal() {
  state.settings = {
    grokKey: document.getElementById('grokKey').value.trim(),
    grokModel: document.getElementById('grokModel').value,
    cfWorkers: document.getElementById('cfWorkers').value.trim(),
    cfPages: document.getElementById('cfPages').value.trim(),
    cfR2: document.getElementById('cfR2').value.trim(),
    supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
    dbUrl: document.getElementById('dbUrl').value.trim()
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  ui.settingsModal.classList.add('hidden');
  renderOverview();
}

function saveProjectToHistory() {
  state.history.push(JSON.parse(JSON.stringify(state.project)));
  if (state.history.length > 12) state.history.shift();
  saveHistory();
}

function buildFallbackSite(prompt) {
  const clean = prompt.trim().replace(/\s+/g, ' ').slice(0, 120);
  const title = clean ? clean.split(' ').slice(0, 3).join(' ') : 'Claudet';

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          :root { --bg:#0b0b0b; --panel:#121212; --text:#f4f1ee; --muted:#9a958f; --clay:#d97757; --line:rgba(255,255,255,0.08); }
          * { box-sizing: border-box; }
          body { margin:0; background:radial-gradient(circle at top left, rgba(217,119,87,0.14), transparent 16%), linear-gradient(180deg, #0b0b0b, #111111); color: var(--text); font-family: Inter, sans-serif; }
          .page { max-width:1200px; margin:0 auto; padding:22px 18px 60px; }
          .topbar { display:flex; justify-content:space-between; align-items:center; border:1px solid var(--line); border-radius:22px; background:rgba(255,255,255,0.02); padding:16px 20px; }
          .brand { font-family:Georgia,serif; font-size:28px; }
          .nav { display:flex; gap:12px; }
          .nav a { color:#d7d3ce; text-decoration:none; padding:8px 12px; border-radius:999px; }
          .nav a:hover { background: rgba(255,255,255,0.04); }
          .btn { padding:12px 20px; background:#121212; color:#fff; border:1px solid rgba(255,255,255,0.1); border-radius:999px; }
          .btn.light { background: rgba(255,255,255,0.03); color:#f4f1ee; }
          .hero { display:grid; grid-template-columns:1.2fr 0.8fr; gap:28px; align-items:center; padding-top:48px; }
          h1 { font-family:Georgia,serif; font-size:clamp(42px,5vw,68px); line-height:1.02; margin:0; }
          .eyebrow { font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color: var(--muted); }
          p { color:#d7d3ce; line-height:1.7; font-size:17px; }
          .actions { display:flex; gap:12px; margin-top:24px; flex-wrap:wrap; }
          .mini { background: rgba(255,255,255,0.02); border:1px solid var(--line); border-radius:24px; padding:24px; }
          .row { display:flex; align-items:center; gap:12px; background: rgba(255,255,255,0.02); border:1px solid var(--line); border-radius:16px; padding:18px 16px; margin-top:12px; }
          .dot { width:10px; height:10px; border-radius:50%; background: var(--clay); box-shadow:0 0 0 6px rgba(217,119,87,0.12); }
          .grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap:20px; margin-top:32px; }
          .card { background: rgba(255,255,255,0.02); border:1px solid var(--line); border-radius:20px; padding:22px; }
          .icon { width:42px; height:42px; border-radius:12px; background: rgba(217,119,87,0.1); display:grid; place-items:center; color: var(--clay); }
          .card h3 { font-family:Georgia,serif; font-size:28px; margin:12px 0 8px; }
          .plans { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:20px; margin-top:36px; }
          .tier { background: rgba(255,255,255,0.02); border:1px solid var(--line); border-radius:22px; padding:24px 20px; }
          .tier.featured { background: linear-gradient(180deg,#171717,#111111); box-shadow:0 18px 40px rgba(0,0,0,0.24); }
          .price { font-family:Georgia,serif; font-size:40px; margin-top:16px; }
          .faq { margin-top:42px; }
          .faq-item { border-top:1px solid var(--line); padding:16px 0; }
          .faq-item:last-child { border-bottom:1px solid var(--line); }
          @media (max-width:980px) { .hero, .grid, .plans { grid-template-columns:1fr; } .topbar { flex-wrap:wrap; } .nav { order:3; width:100%; justify-content:center; } }
        </style>
      </head>
      <body>
        <div class="page">
          <header class="topbar">
            <div class="brand">${title}</div>
            <nav class="nav">
              <a href="#">Продукт</a>
              <a href="#">Решения</a>
              <a href="#">Цены</a>
              <a href="#">Документы</a>
            </nav>
            <button class="btn">Начать</button>
          </header>

          <main>
            <section class="hero">
              <div>
                <div class="eyebrow">Преобразуем идеи в продукты</div>
                <h1>Собирайте интерфейсы и продукты в одном AI-потоке.</h1>
                <p>${clean}</p>
                <div class="actions">
                  <button class="btn">Собрать проект</button>
                  <button class="btn light">Посмотреть демо</button>
                </div>
              </div>

              <div class="mini">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9a958f;">
                  <span>Live</span>
                  <span>AI control</span>
                </div>
                <div class="row"><span class="dot"></span> Генерация лендинга</div>
                <div class="row"><span class="dot"></span> UI-система продукта</div>
                <div class="row"><span class="dot"></span> Самоисправление ошибок</div>
              </div>
            </section>

            <section style="margin-top:56px;">
              <div class="eyebrow">Почему выбирают</div>
              <h2 style="font-family:Georgia,serif;font-size:clamp(28px,3vw,42px);margin:0;">Стиль, скорость и точность в одном месте.</h2>
              <div class="grid">
                <div class="card"><div class="icon">✦</div><h3>AI генерация</h3><p>Промпт в продукт без лишних этапов.</p></div>
                <div class="card"><div class="icon">◌</div><h3>Live preview</h3><p>Предпросмотр в реальном времени.</p></div>
                <div class="card"><div class="icon">◎</div><h3>Автоисправление</h3><p>Ошибки ловятся и исправляются автоматически.</p></div>
              </div>
            </section>

            <section style="margin-top:56px;">
              <div class="eyebrow">Планы</div>
              <h2 style="font-family:Georgia,serif;font-size:clamp(28px,3vw,42px);margin:0;text-align:center;">Простые тарифы для продуктовых команд.</h2>
              <div class="plans">
                <div class="tier"><div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a958f;">Starter</div><div class="price">$0</div><p>Прототип и первые идеи.</p><button class="btn light">Попробовать</button></div>
                <div class="tier featured"><div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a958f;">Pro</div><div class="price">$29<span style="font-size:18px;color:#9a958f;font-family:Inter,sans-serif;">/мес</span></div><p>Полный AI-доступ и экспорт проекта.</p><button class="btn">Начать Pro</button></div>
                <div class="tier"><div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a958f;">Scale</div><div class="price">$99<span style="font-size:18px;color:#9a958f;font-family:Inter,sans-serif;">/мес</span></div><p>Ко��анды и многократные релизы.</p><button class="btn light">Связаться</button></div>
              </div>
            </section>

            <section class="faq">
              <div class="eyebrow">FAQ</div>
              <h2 style="font-family:Georgia,serif;font-size:clamp(28px,3vw,42px);margin:0;">Частые вопросы.</h2>
              <div class="faq-item"><button class="btn light" style="width:100%;text-align:left;">Можно ли экспортировать проект?</button></div>
              <div class="faq-item"><button class="btn light" style="width:100%;text-align:left;">Работает ли без внешней инфраструктуры?</button></div>
            </section>
          </main>
        </div>
      </body>
    </html>
  `;

  const css = 'body { background: #0b0b0b; color: #f4f1ee; }';
  const js = 'console.log("Claudet fallback generated")';

  state.project.projectName = title;
  state.project.aiSummary = 'Автогенерация через локальный fallback завершена.';
  state.project.files = {
    'index.html': { name: 'index.html', content: html.trim() },
    'styles.css': { name: 'styles.css', content: css.trim() },
    'script.js': { name: 'script.js', content: js.trim() }
  };
  state.selectedFile = 'index.html';
  saveProject();
  renderAll();
}

async function callGrok(prompt) {
  if (!state.settings.grokKey) return null;
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.settings.grokKey}`
    },
    body: JSON.stringify({
      model: state.settings.grokModel || 'grok-beta',
      messages: [
        { role: 'system', content: 'Ты — senior product designer и frontend engineer. Отвечай строго в HTML/CSS/JS. Сделай визуально premium, dark editorial, русскоязычную верстку.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1800
    })
  });

  if (!response.ok) throw new Error('xAI error');
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

function extractCodeBlocks(text) {
  const matches = [...text.matchAll(/```(?:html|css|js|javascript)?\s*([\s\S]*?)```/gi)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function applyGeneratedCode(rawText) {
  const blocks = extractCodeBlocks(rawText);
  if (blocks.length) {
    const htmlBlock = blocks.find((block) => /<html|<body|<section|<div/i.test(block)) || blocks[0];
    const cssBlock = blocks.find((block) => /body|:root|\.|@media/i.test(block)) || 'body{font-family:Inter,sans-serif;background:#0b0b0b;color:#f4f1ee;}';
    const jsBlock = blocks.find((block) => /document|function|const|addEventListener/i.test(block)) || 'console.log("Generated by Claudet")';

    state.project.files['index.html'] = { name: 'index.html', content: htmlBlock };
    state.project.files['styles.css'] = { name: 'styles.css', content: cssBlock };
    state.project.files['script.js'] = { name: 'script.js', content: jsBlock };
    state.project.aiSummary = 'Сгенерировано через xAI/Grok и применено в проект.';
    state.selectedFile = 'index.html';
    saveProject();
    renderAll();
    return;
  }

  const fallback = rawText.replace(/```/g, '').trim();
  if (fallback) {
    state.project.files['index.html'] = { name: 'index.html', content: fallback };
    state.project.aiSummary = 'Получен ответ ИИ без явных блоков кода — применили в index.html.';
    saveProject();
    renderAll();
  }
}

async function generateFromPrompt() {
  const prompt = document.getElementById('promptInput').value.trim();
  if (!prompt) return;

  addMessage('user', prompt, ['Контекст закреплён', 'Генерация запущена']);
  document.getElementById('promptInput').value = '';

  if (state.settings.grokKey) {
    addMessage('ai', 'Подключаюсь к xAI / Grok и формирую проект...', ['Модель: ' + (state.settings.grokModel || 'grok-beta'), 'Запрос отправляется в live API']);
    try {
      const generated = await callGrok(prompt);
      if (!generated) throw new Error('Пустой ответ от xAI');
      applyGeneratedCode(generated);
      addMessage('ai', 'Проект сгенерирован и применён в рабочем пространстве.', ['Код загружен в проект', 'Предпросмотр обновлён']);
    } catch (err) {
      console.error(err);
      addMessage('ai', 'Ошибка xAI — активирован локальный fallback.', ['Переход на браузерный генератор', 'Работа сохранена без потерь']);
      buildFallbackSite(prompt);
    }
  } else {
    addMessage('ai', 'Ключ xAI/Grok не задан — активирован локальный fallback.', ['Работа идёт полностью в браузере', 'Без ошибок и без внешнего доступа']);
    buildFallbackSite(prompt);
  }

  renderOverview();
}

document.getElementById('generateBtn').addEventListener('click', generateFromPrompt);

document.getElementById('saveProjectBtn').addEventListener('click', () => {
  saveProject();
  saveProjectToHistory();
  addMessage('ai', 'Проект сохранён в локальном хранилище.', ['Браузерное хранилище обновлено']);
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = state.project.files[state.selectedFile]?.content || '';
  try {
    await navigator.clipboard.writeText(text);
    addMessage('ai', `Содержимое ${state.selectedFile} скопировано в буфер обмена.`, ['Буфер обновлён']);
  } catch {
    addMessage('ai', 'Буфер обмена недоступен в этом браузере.', ['Проверьте настройки браузера']);
  }
});

document.getElementById('rollbackBtn').addEventListener('click', () => {
  if (!state.history.length) return;
  const prev = state.history.pop();
  state.project = prev;
  saveHistory();
  saveProject();
  renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const JSZip = window.JSZip;
  if (!JSZip) return;
  const zip = new JSZip();
  Object.values(state.project.files).forEach((file) => zip.file(file.name, file.content));
  zip.generateAsync({ type: 'blob' }).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claudet-export.zip';
    a.click();
    URL.revokeObjectURL(url);
  });
});

document.getElementById('openSettingsBtn').addEventListener('click', () => {
  populateSettingsModal();
  ui.settingsModal.classList.remove('hidden');
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => ui.settingsModal.classList.add('hidden'));

document.getElementById('saveSettingsBtn').addEventListener('click', saveSettingsFromModal);

document.getElementById('resetSettingsBtn').addEventListener('click', () => {
  state.settings = {};
  localStorage.removeItem(STORAGE_KEYS.settings);
  populateSettingsModal();
});

document.getElementById('addContextBtn').addEventListener('click', () => {
  const chip = document.createElement('span');
  chip.textContent = 'подход';
  chip.style.padding = '6px 10px';
  chip.style.borderRadius = '999px';
  chip.style.background = 'rgba(255,255,255,0.03)';
  chip.style.border = '1px solid rgba(255,255,255,0.08)';
  chip.style.color = '#d7d3ce';
  chip.style.fontSize = '11px';
  ui.contextChips.appendChild(chip);
});

document.getElementById('editorTextarea').addEventListener('input', (e) => {
  if (!state.project.files[state.selectedFile]) return;
  state.project.files[state.selectedFile].content = e.target.value;
  saveProject();
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
});

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'preview-error') {
    addMessage('ai', 'Обнаружена ошибка рендера — активировано автоисправление.', ['Скрипт обёрнут в безопасный блок', 'Предпросмотр будет восстановлен']);
    const scriptText = state.project.files['script.js']?.content || '';
    state.project.files['script.js'] = {
      name: 'script.js',
      content: `try { ${scriptText} } catch (error) { console.warn('Auto-heal:', error.message); }`
    };
    saveProject();
    renderPreview();
  }
});

if (!state.chat.length) {
  state.chat = [
    {
      role: 'ai',
      text: 'Привет — я Claudet. Опиши, что хочешь собрать, и я сгенерирую проект прямо в браузере.',
      logs: ['Локальный режим активен', 'xAI/Grok доступен через настройки']
    }
  ];
}

renderAll();
populateSettingsModal();
