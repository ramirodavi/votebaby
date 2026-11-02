// Página de configuração (admin.html): lê e grava os parâmetros editáveis do backend
// (GET/PUT /admin/settings, protegidos pela senha ADMIN_PASSWORD).

const PASSWORD_KEY = 'adminPassword';

let apiBase;
let password = sessionStorage.getItem(PASSWORD_KEY) || '';
let settings = [];   // metadados vindos do backend (tipo, padrão, opções, limites)
let saved = {};      // valores atualmente no backend
let draft = {};      // valores no formulário (ainda por salvar)

// Rótulo, ajuda e seção de cada parâmetro (a lista e as regras vêm do backend/settings.js).
const FIELD_INFO = {
    REVEAL_RESULT: {
        section: 'reveal', label: 'Resultado',
        help: 'Ao revelar, todos os celulares e o telão abertos mostram a contagem 3‑2‑1 na hora.',
    },
    REVEAL_TEXT: {
        section: 'reveal', label: 'Frase da revelação', placeholder: 'Ex.: Bem-vinda, Laura!',
        help: 'Aparece abaixo de "É uma menina!" / "É um menino!". Opcional.',
    },
    ALLOW_COMMENTS_AFTER_REVEAL: {
        section: 'reveal', label: 'Comentários depois da revelação',
        help: 'Ligado: o formulário continua aberto como "Deixe um recado para o bebê". Desligado: some e novos comentários são recusados.',
    },
    BABY_BOY_NAME: {
        section: 'names', label: 'Opção menino', placeholder: 'Menino',
        help: 'Usado nos botões, no placar ("Time …") e no histórico.',
    },
    BABY_GIRL_NAME: {
        section: 'names', label: 'Opção menina', placeholder: 'Menina',
        help: 'Usado nos botões, no placar ("Time …") e no histórico.',
    },
    BOY_COLOR: { section: 'colors-boy', label: 'Cor principal', help: 'Botão, barra, placar e avatares do time.' },
    BG_BOY_COLOR: { section: 'colors-boy', label: 'Fundo da página', help: 'Lado de baixo/direita do degradê do fundo.' },
    BALLOON_BOY_COLOR: { section: 'colors-boy', label: 'Balões', help: 'Balões que sobem depois de revelar "menino".' },
    REVEAL_BG_BOY_COLOR: { section: 'colors-boy', label: 'Faixa da revelação', help: 'Fundo de "É um menino!" e da tela da contagem.' },
    GIRL_COLOR: { section: 'colors-girl', label: 'Cor principal', help: 'Botão, barra, placar e avatares do time.' },
    BG_GIRL_COLOR: { section: 'colors-girl', label: 'Fundo da página', help: 'Lado de cima/esquerda do degradê e barra do navegador no celular.' },
    BALLOON_GIRL_COLOR: { section: 'colors-girl', label: 'Balões', help: 'Balões que sobem depois de revelar "menina".' },
    REVEAL_BG_GIRL_COLOR: { section: 'colors-girl', label: 'Faixa da revelação', help: 'Fundo de "É uma menina!" e da tela da contagem.' },
    ENABLE_AUTO_SCROLL: {
        section: 'page', label: 'Rolagem automática depois da revelação',
        help: 'A página sobe e desce sozinha (útil numa tela sem o modo telão). No telão as listas já rolam sozinhas.',
    },
};

const REVEAL_OPTIONS = {
    pending: () => '⏳ Ainda não revelado',
    boy: () => `🚗 ${draft.BABY_BOY_NAME || 'Menino'}`,
    girl: () => `🎀 ${draft.BABY_GIRL_NAME || 'Menina'}`,
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

/** Mesmo endereço do backend usado pelo site (localhost em desenvolvimento; config.json em produção). */
async function resolveApiBase() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    const response = await fetch(new URL('config.json', window.location.href));
    const data = await response.json();
    return (data.configBase || '').trim().replace(/\/$/, '');
}

async function api(method, path, body) {
    const response = await fetch(`${apiBase}${path}`, {
        method,
        headers: { Authorization: `Bearer ${password}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || `Erro ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return data;
}

function showToast(message, variant = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    toast.addEventListener('click', () => toast.remove());
    setTimeout(() => toast.remove(), duration);
    document.getElementById('toast-container').appendChild(toast);
}

function confirmDialog(message) {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('modal-confirm-message').textContent = message;
    modal.hidden = false;
    document.getElementById('modal-confirm-cancel').focus();
    return new Promise((resolve) => {
        const close = (result) => {
            modal.hidden = true;
            ok.removeEventListener('click', onOk);
            cancel.removeEventListener('click', onCancel);
            resolve(result);
        };
        const ok = document.getElementById('modal-confirm-ok');
        const cancel = document.getElementById('modal-confirm-cancel');
        const onOk = () => close(true);
        const onCancel = () => close(false);
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
    });
}

// ─── Cores: #rrggbb ⇄ rgb(r, g, b) ───────────────────────────────────────────

/** [r, g, b] ou null se o texto não for #rrggbb nem rgb(r, g, b) válido. */
function parseColor(value) {
    const text = (value || '').trim();
    const hex = text.match(/^#([0-9a-f]{6})$/i);
    if (hex) return [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16));
    const rgb = text.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgb && rgb.slice(1).every(n => Number(n) <= 255)) return rgb.slice(1).map(Number);
    return null;
}

const toHex = rgb => `#${rgb.map(n => n.toString(16).padStart(2, '0')).join('')}`;
// Mesmo formato usado no .env.
const toRgbString = rgb => `rgb(${rgb.join(', ')})`;

// ─── Validação e estado ───────────────────────────────────────────────────────

function fieldError(setting, value) {
    if (setting.type === 'color' && !parseColor(value)) return 'Cor inválida: use #rrggbb ou rgb(r, g, b).';
    if (setting.type === 'text') {
        if (setting.required && !value.trim()) return 'Não pode ficar vazio.';
        if (value.length > setting.maxLength) return `No máximo ${setting.maxLength} caracteres.`;
    }
    return null;
}

/** Igualdade ignorando diferenças só de formato (ex.: #3ab162 e rgb(58, 177, 98)). */
function sameValue(setting, a, b) {
    if (setting.type === 'color') {
        const ca = parseColor(a);
        const cb = parseColor(b);
        return !!ca && !!cb && ca.join() === cb.join();
    }
    return (setting.type === 'text' ? a.trim() : a) === (setting.type === 'text' ? b.trim() : b);
}

const changedKeys = () => settings.filter(s => !sameValue(s, draft[s.key], saved[s.key])).map(s => s.key);
const invalidKeys = () => settings.filter(s => fieldError(s, draft[s.key])).map(s => s.key);

function setDraft(key, value) {
    draft[key] = value;
    refreshField(key);
    // Os nomes aparecem nos botões do resultado e na pré-visualização.
    if (key === 'BABY_BOY_NAME' || key === 'BABY_GIRL_NAME') refreshField('REVEAL_RESULT');
    updateSaveBar();
    updatePreview();
}

// ─── Campos ───────────────────────────────────────────────────────────────────

function defaultLabel(setting) {
    if (setting.type === 'boolean') return setting.default === 'true' ? 'ligado' : 'desligado';
    if (setting.type === 'enum') return REVEAL_OPTIONS[setting.default]();
    return setting.default === '' ? '(vazio)' : setting.default;
}

function createControl(setting) {
    const { key } = setting;
    const info = FIELD_INFO[key];

    if (setting.type === 'enum') {
        const group = document.createElement('div');
        group.className = 'segmented reveal-choice';
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', info.label);
        setting.options.forEach((option) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.value = option;
            btn.setAttribute('role', 'radio');
            btn.addEventListener('click', () => setDraft(key, option));
            group.appendChild(btn);
        });
        return group;
    }

    if (setting.type === 'boolean') {
        const label = document.createElement('label');
        label.className = 'switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('role', 'switch');
        input.id = `field-${key}`;
        input.addEventListener('change', () => setDraft(key, input.checked ? 'true' : 'false'));
        const track = document.createElement('span');
        track.className = 'switch-track';
        const text = document.createElement('span');
        text.className = 'switch-text';
        label.append(input, track, text);
        return label;
    }

    if (setting.type === 'color') {
        const wrap = document.createElement('div');
        wrap.className = 'color-control';
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.setAttribute('aria-label', `${info.label} (seletor)`);
        picker.addEventListener('input', () => setDraft(key, toRgbString(parseColor(picker.value))));
        const text = document.createElement('input');
        text.type = 'text';
        text.id = `field-${key}`;
        text.spellcheck = false;
        text.addEventListener('input', () => setDraft(key, text.value));
        wrap.append(picker, text);
        return wrap;
    }

    // Texto
    const wrap = document.createElement('div');
    wrap.className = 'text-control';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `field-${key}`;
    input.maxLength = setting.maxLength;
    input.placeholder = info.placeholder || '';
    input.addEventListener('input', () => setDraft(key, input.value));
    const counter = document.createElement('span');
    counter.className = 'char-counter';
    wrap.append(input, counter);
    return wrap;
}

function renderField(setting) {
    const info = FIELD_INFO[setting.key];
    const field = document.createElement('div');
    field.className = 'field';
    field.dataset.key = setting.key;

    const head = document.createElement('div');
    head.className = 'field-head';
    const label = document.createElement(setting.type === 'enum' ? 'span' : 'label');
    label.className = 'field-label';
    label.textContent = info.label;
    if (setting.type !== 'enum') label.htmlFor = `field-${setting.key}`;
    const badge = document.createElement('span');
    badge.className = 'changed-badge';
    badge.textContent = 'alterado';
    head.append(label, badge);

    const help = document.createElement('p');
    help.className = 'field-help';
    help.textContent = info.help;

    const error = document.createElement('p');
    error.className = 'form-error';
    error.hidden = true;

    const footer = document.createElement('div');
    footer.className = 'field-footer';
    const def = document.createElement('span');
    def.textContent = `Padrão: ${defaultLabel(setting)}`;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'link-button reset-button';
    reset.textContent = '↺ Restaurar padrão';
    reset.addEventListener('click', () => {
        setDraft(setting.key, setting.default);
        syncControl(setting.key);
    });
    footer.append(def, reset);

    field.append(head, createControl(setting), help, error, footer);
    return field;
}

/** Leva o valor do rascunho para o controle (ao carregar, descartar ou restaurar o padrão). */
function syncControl(key) {
    const setting = settings.find(s => s.key === key);
    const field = document.querySelector(`.field[data-key="${key}"]`);
    const value = draft[key];
    if (setting.type === 'boolean') {
        field.querySelector('input').checked = value === 'true';
    } else if (setting.type === 'color') {
        field.querySelector('input[type="text"]').value = value;
        const rgb = parseColor(value);
        if (rgb) field.querySelector('input[type="color"]').value = toHex(rgb);
    } else if (setting.type === 'text') {
        field.querySelector('input').value = value;
    }
    refreshField(key);
}

/** Atualiza marcações do campo: alterado, erro, contador, botões do resultado, padrão. */
function refreshField(key) {
    const setting = settings.find(s => s.key === key);
    const field = document.querySelector(`.field[data-key="${key}"]`);
    if (!setting || !field) return;
    const value = draft[key];

    field.classList.toggle('field--changed', !sameValue(setting, value, saved[key]));
    field.querySelector('.reset-button').hidden = sameValue(setting, value, setting.default);

    const error = fieldError(setting, value);
    const errorEl = field.querySelector('.form-error');
    errorEl.hidden = !error;
    errorEl.textContent = error || '';
    field.classList.toggle('field--invalid', !!error);

    if (setting.type === 'enum') {
        field.querySelectorAll('[data-value]').forEach((btn) => {
            const active = btn.dataset.value === value;
            btn.textContent = REVEAL_OPTIONS[btn.dataset.value]();
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-checked', String(active));
        });
    } else if (setting.type === 'boolean') {
        field.querySelector('.switch-text').textContent = value === 'true' ? 'Ligado' : 'Desligado';
    } else if (setting.type === 'color') {
        const rgb = parseColor(value);
        if (rgb) field.querySelector('input[type="color"]').value = toHex(rgb);
    } else if (setting.type === 'text') {
        field.querySelector('.char-counter').textContent = `${value.length}/${setting.maxLength}`;
    }
}

function renderSettings() {
    ['reveal', 'names', 'colors-boy', 'colors-girl', 'page'].forEach((section) => {
        document.getElementById(`section-${section}`).replaceChildren();
    });
    settings.forEach((setting) => {
        const info = FIELD_INFO[setting.key];
        if (!info) return;   // parâmetro novo no backend sem texto aqui: ignorado
        document.getElementById(`section-${info.section}`).appendChild(renderField(setting));
        syncControl(setting.key);
    });
    updateSaveBar();
    updatePreview();
}

// ─── Pré-visualização ─────────────────────────────────────────────────────────

let previewMode = 'pending';

function updatePreview() {
    const preview = document.getElementById('preview');
    const color = key => (parseColor(draft[key]) ? draft[key] : saved[key]);
    preview.style.setProperty('--boy-color', color('BOY_COLOR'));
    preview.style.setProperty('--girl-color', color('GIRL_COLOR'));
    preview.style.setProperty('--bg-boy-color', color('BG_BOY_COLOR'));
    preview.style.setProperty('--bg-girl-color', color('BG_GIRL_COLOR'));
    preview.style.setProperty('--preview-reveal-bg', color(previewMode === 'boy' ? 'REVEAL_BG_BOY_COLOR' : 'REVEAL_BG_GIRL_COLOR'));
    preview.style.setProperty('--preview-balloon', color(previewMode === 'boy' ? 'BALLOON_BOY_COLOR' : 'BALLOON_GIRL_COLOR'));
    preview.dataset.mode = previewMode;

    const boyName = draft.BABY_BOY_NAME || 'Menino';
    const girlName = draft.BABY_GIRL_NAME || 'Menina';
    document.getElementById('preview-boy-name').textContent = boyName;
    document.getElementById('preview-girl-name').textContent = girlName;
    document.getElementById('preview-boy-ink').textContent = `Time ${boyName}`;
    document.getElementById('preview-girl-ink').textContent = `Time ${girlName}`;
    document.getElementById('preview-reveal-title').textContent = previewMode === 'boy' ? '🚗 É um menino! 🚗' : '🎀 É uma menina! 🎀';
    document.getElementById('preview-reveal-text').textContent = draft.REVEAL_TEXT || '';
}

// ─── Salvar ───────────────────────────────────────────────────────────────────

function updateSaveBar() {
    const changed = changedKeys();
    const invalid = invalidKeys();
    document.getElementById('save-bar').hidden = changed.length === 0;
    document.getElementById('changes-count').textContent = invalid.length
        ? `⚠️ Corrija ${invalid.length === 1 ? '1 campo' : `${invalid.length} campos`} para salvar`
        : `${changed.length === 1 ? '1 alteração' : `${changed.length} alterações`} por salvar`;
    document.getElementById('save').disabled = invalid.length > 0;
}

function revealConfirmMessage(from, to) {
    if (to === 'pending') return 'A revelação será desfeita para todos agora: a votação volta a aparecer nos celulares e no telão.';
    const name = REVEAL_OPTIONS[to]();
    if (from === 'pending') return `O resultado "${name}" vai aparecer AGORA para todos os convidados e no telão, com a contagem 3‑2‑1.`;
    return `O resultado será trocado para "${name}" para todos agora.`;
}

async function save() {
    const keys = changedKeys();
    if (!keys.length || invalidKeys().length) return;

    if (keys.includes('REVEAL_RESULT')
        && !await confirmDialog(revealConfirmMessage(saved.REVEAL_RESULT, draft.REVEAL_RESULT))) return;

    const values = Object.fromEntries(keys.map(key => [key, draft[key]]));
    const button = document.getElementById('save');
    button.disabled = true;
    button.textContent = 'Salvando…';
    try {
        const result = await api('PUT', '/admin/settings', { values });
        keys.forEach((key) => { saved[key] = draft[key]; });
        settings.forEach(s => refreshField(s.key));
        if (result.persisted === 'render') {
            showToast('✅ Salvo e já valendo! O Render vai reiniciar o servidor em 1–2 min para guardar; as páginas reconectam sozinhas.', 'success', 8000);
        } else if (result.persisted === 'memory') {
            showToast('⚠️ Já está valendo, mas só até o próximo reinício (RENDER_API_KEY / RENDER_SERVICE_ID não configurados).', 'error', 10000);
        } else if (result.persisted === 'error') {
            showToast(`⚠️ ${result.persistError}`, 'error', 10000);
        } else {
            showToast('Nada mudou.', 'info');
        }
    } catch (err) {
        handleApiError(err);
    } finally {
        button.textContent = 'Salvar';
        updateSaveBar();
    }
}

function discard() {
    draft = { ...saved };
    settings.forEach(s => syncControl(s.key));
    updateSaveBar();
    updatePreview();
}

// ─── Entrar / sair ────────────────────────────────────────────────────────────

function showLogin(message) {
    document.getElementById('login-form').hidden = false;
    document.getElementById('settings').hidden = true;
    document.getElementById('admin-links').hidden = true;
    document.getElementById('save-bar').hidden = true;
    const error = document.getElementById('login-error');
    error.hidden = !message;
    error.textContent = message || '';
    document.getElementById('password').focus();
}

function handleApiError(err) {
    if (err.status === 401) {
        sessionStorage.removeItem(PASSWORD_KEY);
        password = '';
        showLogin('Senha incorreta.');
    } else if (err.status === 429 || err.status === 503) {
        showLogin(err.message);
    } else if (err.status) {
        showToast(err.message, 'error', 8000);
    } else {
        showLogin('Não foi possível conectar ao servidor. Ele pode estar acordando: tente de novo em alguns segundos.');
    }
}

async function loadSettings() {
    const data = await api('GET', '/admin/settings');
    settings = data.settings;
    saved = Object.fromEntries(settings.map(s => [s.key, s.value]));
    draft = { ...saved };
    document.getElementById('persistence-note').hidden = data.persistence === 'render';
    document.getElementById('login-form').hidden = true;
    document.getElementById('settings').hidden = false;
    document.getElementById('admin-links').hidden = false;
    renderSettings();
}

async function login(event) {
    event.preventDefault();
    const button = document.getElementById('login-submit');
    password = document.getElementById('password').value;
    button.disabled = true;
    button.textContent = 'Entrando…';
    try {
        await loadSettings();
        sessionStorage.setItem(PASSWORD_KEY, password);
        document.getElementById('password').value = '';
    } catch (err) {
        handleApiError(err);
    } finally {
        button.disabled = false;
        button.textContent = 'Entrar';
    }
}

function logout() {
    if (changedKeys().length && !window.confirm('Há alterações por salvar. Sair mesmo assim?')) return;
    sessionStorage.removeItem(PASSWORD_KEY);
    password = '';
    settings = [];
    showLogin();
}

// ─── Inicialização ────────────────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', login);
document.getElementById('logout').addEventListener('click', logout);
document.getElementById('save').addEventListener('click', save);
document.getElementById('discard').addEventListener('click', discard);
document.getElementById('toggle-password').addEventListener('click', () => {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
});
document.querySelectorAll('#preview-mode [data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
        previewMode = btn.dataset.mode;
        document.querySelectorAll('#preview-mode [data-mode]').forEach(b => b.classList.toggle('is-active', b === btn));
        updatePreview();
    });
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('modal-confirm').hidden) {
        document.getElementById('modal-confirm-cancel').click();
    }
});
window.addEventListener('beforeunload', (e) => {
    if (settings.length && changedKeys().length) e.preventDefault();
});

(async () => {
    try {
        apiBase = await resolveApiBase();
    } catch (err) {
        showLogin('Não foi possível ler config.json (endereço do backend).');
        return;
    }
    if (!password) {
        showLogin();
        return;
    }
    try {
        await loadSettings();
    } catch (err) {
        handleApiError(err);
    }
})();
