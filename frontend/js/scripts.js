let apiUrl;
let webSocketUrl;
/** URL completa GET /config — definida em initializeApp (localhost fixo; resto via config.json). */
let configUrl;

/**
 * Em localhost usa o backend local. Noutros hosts (ex.: GitHub Pages) lê frontend/config.json
 * com "configBase": URL HTTPS do backend (sem barra no fim). Edita esse ficheiro ao mudar de deploy.
 */
async function resolveConfigUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/config';
    }
    const jsonUrl = new URL('config.json', window.location.href);
    const response = await fetch(jsonUrl);
    if (!response.ok) {
        throw new Error('Não foi possível carregar config.json. Coloque config.json junto ao index.html.');
    }
    const data = await response.json();
    const base = (data.configBase || '').trim().replace(/\/$/, '');
    if (!base) {
        throw new Error('Em config.json defina "configBase" com a URL HTTPS do backend (ex.: https://meu-api.onrender.com).');
    }
    return `${base}/config`;
}

function apiUrlToWebSocketUrl(apiUrlString) {
    const u = new URL(apiUrlString);
    const wsProtocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${u.host}`;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

// Manter em sincronia com backend/utils/helpers.js (formatName).
function formatName(name) {
    return name.trim().split(/\s+/)
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');
}

/** Mensagem de erro devolvida pelo backend ({ error }) ou o texto padrão. */
async function readErrorMessage(response, fallback) {
    try {
        const body = await response.json();
        if (body.error) return body.error;
    } catch (_) { /* ignore */ }
    return fallback;
}

function showLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-popup">
            <p>Carregando dados...</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}

async function withLoading(operation) {
    if (typeof operation !== 'function') {
        console.warn('Nenhuma operação válida foi passada para withLoading.');
        return;
    }
    const loadingTimeout = setTimeout(() => showLoading(), 3000);
    try {
        await operation();
    } catch (err) {
        console.error('Erro durante operação:', err.message);
        showToast(err.message, 'error');
        throw err;
    } finally {
        clearTimeout(loadingTimeout);
        hideLoading();
    }
}

// ─── Avisos (toasts) e confirmação ────────────────────────────────────────────

const MAX_TOASTS = 3;

/** variant: 'info' | 'success' | 'error' | 'boy' | 'girl' (cor da faixa lateral). */
function showToast(message, variant = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    while (container.children.length >= MAX_TOASTS) {
        container.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    toast.textContent = message;

    const dismiss = () => {
        toast.classList.add('toast--leaving');
        setTimeout(() => toast.remove(), 200);
    };
    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);

    container.appendChild(toast);
}

let resolveConfirm = null;

/** Modal de confirmação no estilo da página. Resolve true (confirmou) ou false. */
function confirmDialog(message, confirmLabel = 'Excluir') {
    closeConfirmDialog(false);
    document.getElementById('modal-confirm-message').textContent = message;
    document.getElementById('modal-confirm-ok').textContent = confirmLabel;
    openModal(document.getElementById('modal-confirm'), document.getElementById('modal-confirm-cancel'));
    return new Promise(resolve => { resolveConfirm = resolve; });
}

function closeConfirmDialog(result) {
    closeModal(document.getElementById('modal-confirm'));
    if (resolveConfirm) {
        resolveConfirm(result);
        resolveConfirm = null;
    }
}

// ─── Identificador do navegador ───────────────────────────────────────────────

let browserId = localStorage.getItem('browserId');
if (!browserId) {
    browserId = crypto.randomUUID();
    localStorage.setItem('browserId', browserId);
}

// Nome do convidado: preenchido automaticamente no voto e no comentário nas próximas visitas.
const GUEST_NAME_KEY = 'guestName';

function saveGuestName(name) {
    localStorage.setItem(GUEST_NAME_KEY, formatName(name));
}

/** Preenche os campos de nome vazios (voto e comentário). */
function fillGuestName(name) {
    if (!name) return;
    ['name-input', 'comment-name'].forEach((id) => {
        const input = document.getElementById(id);
        if (!input.value.trim()) input.value = name;
    });
}

// ─── Modais: foco ─────────────────────────────────────────────────────────────

/** Abre o modal, foca `focusEl` (ou o primeiro controlo) e guarda para onde devolver o foco ao fechar. */
function openModal(modal, focusEl) {
    modal.returnFocusTo = document.activeElement;
    modal.hidden = false;
    (focusEl || modal.querySelector('input, textarea, button')).focus();
}

function closeModal(modal) {
    if (modal.hidden) return;
    modal.hidden = true;
    const target = modal.returnFocusTo;
    modal.returnFocusTo = null;
    if (target && target.isConnected) target.focus();
}

/** Tab e Shift+Tab circulam só dentro do modal aberto. */
function trapFocusInOpenModal(e) {
    const modal = document.querySelector('.modal-overlay:not([hidden])');
    if (e.key !== 'Tab' || !modal) return;
    const focusables = [...modal.querySelectorAll('button, input, textarea')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!modal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

// ─── Configurações padrão ─────────────────────────────────────────────────────

let babyBoyName = 'Menino';
let babyGirlName = 'Menina';
let revealResult = 'pending';
let revealText = '';

let boyColor = 'rgb(58, 177, 98)';
let bgBoyColor = 'rgb(172, 241, 197)';
let girlColor = 'rgb(219, 130, 207)';
let bgGirlColor = 'rgb(231, 179, 223)';

let balloonBoyColor = 'rgb(58, 177, 98)';
let balloonGirlColor = 'rgb(219, 130, 207)';
let revealBgBoyColor = 'rgb(172, 241, 197)';
let revealBgGirlColor = 'rgb(231, 179, 223)';

let enableAutoScroll = false;

// Listas atuais, na mesma ordem do backend (votos por id crescente, comentários decrescente).
let votesState = [];
let commentsState = [];

const MINE_HINT = 'Alterar ou excluir este item';
let contextAction = { type: null, vote: null, comment: null };
let menuAnchorButton = null;
let pendingVoteForEdit = null;
let pendingCommentForEdit = null;

function isBrowserOwner(rowBrowserId) {
    return rowBrowserId != null && String(rowBrowserId) === String(browserId);
}

function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) menu.hidden = true;
    menuAnchorButton = null;
    contextAction = { type: null, vote: null, comment: null };
}

function positionMenuNearAnchor(menu, anchor) {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const rect = anchor.getBoundingClientRect();
            const mw = menu.offsetWidth;
            const mh = menu.offsetHeight;
            let left = rect.right - mw;
            let top = rect.bottom + 4;
            if (left < 8) left = 8;
            if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
            if (top + mh > window.innerHeight - 8) top = rect.top - mh - 4;
            if (top < 8) top = 8;
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
        });
    });
}

function toggleActionsMenu(anchor, action) {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    if (menuAnchorButton === anchor && !menu.hidden) {
        hideContextMenu();
        return;
    }
    contextAction = action;
    menuAnchorButton = anchor;
    menu.hidden = false;
    positionMenuNearAnchor(menu, anchor);
}

function createEntryActionsButton(onActivate) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'entry-actions-btn';
    btn.setAttribute('aria-label', MINE_HINT);
    btn.setAttribute('title', MINE_HINT);
    btn.setAttribute('aria-haspopup', 'true');
    btn.innerHTML = `
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.75"/>
            <circle cx="12" cy="12" r="1.75"/>
            <circle cx="12" cy="19" r="1.75"/>
        </svg>
    `;
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onActivate(btn);
    });
    return btn;
}

function closeVoteEditModal() {
    closeModal(document.getElementById('modal-edit-vote'));
    pendingVoteForEdit = null;
}

function closeCommentEditModal() {
    closeModal(document.getElementById('modal-edit-comment'));
    pendingCommentForEdit = null;
}

function setupContextMenuAndModals() {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.querySelectorAll('[data-context-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.getAttribute('data-context-action');
            const vote = contextAction.vote;
            const comment = contextAction.comment;
            const type = contextAction.type;
            // O foco volta ao botão ⋮ (e não ao item do menu, que fica oculto) ao fechar o modal.
            menuAnchorButton?.focus();

            if (action === 'edit') {
                if (type === 'vote' && vote) {
                    pendingVoteForEdit = vote;
                    hideContextMenu();
                    openModal(document.getElementById('modal-edit-vote'));
                } else if (type === 'comment' && comment) {
                    pendingCommentForEdit = comment;
                    hideContextMenu();
                    document.getElementById('modal-comment-name').value = comment.name;
                    document.getElementById('modal-comment-message').value = comment.message;
                    openModal(document.getElementById('modal-edit-comment'));
                }
                return;
            }

            if (action === 'delete') {
                hideContextMenu();
                if (type === 'vote' && vote) deleteVote(vote.id);
                else if (type === 'comment' && comment) deleteComment(comment.id);
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('#context-menu')) return;
        hideContextMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
            closeVoteEditModal();
            closeCommentEditModal();
            closeConfirmDialog(false);
        }
        trapFocusInOpenModal(e);
    });

    document.getElementById('modal-confirm-ok').addEventListener('click', () => closeConfirmDialog(true));
    document.getElementById('modal-confirm-cancel').addEventListener('click', () => closeConfirmDialog(false));
    document.getElementById('modal-confirm').addEventListener('click', (e) => {
        if (e.target.id === 'modal-confirm') closeConfirmDialog(false);
    });

    const changeVoteFromModal = async (gender) => {
        if (!pendingVoteForEdit) return;
        const v = pendingVoteForEdit;
        closeVoteEditModal();
        if (v.gender === gender) {
            showToast(`${v.name} já votou em ${genderLabel(gender)}. 😉`, gender);
            return;
        }
        await submitVote(v.name, gender);
        showToast(`Voto alterado para ${genderLabel(gender)}.`, gender);
    };
    document.getElementById('modal-vote-boy').addEventListener('click', () => changeVoteFromModal('boy'));
    document.getElementById('modal-vote-girl').addEventListener('click', () => changeVoteFromModal('girl'));

    document.getElementById('modal-vote-cancel').addEventListener('click', closeVoteEditModal);

    document.getElementById('modal-edit-vote').addEventListener('click', (e) => {
        if (e.target.id === 'modal-edit-vote') closeVoteEditModal();
    });

    document.getElementById('modal-comment-save').addEventListener('click', async () => {
        if (!pendingCommentForEdit) return;
        const name = document.getElementById('modal-comment-name').value.trim();
        const message = document.getElementById('modal-comment-message').value.trim();
        if (!name || !message) {
            showToast('Por favor, preencha todos os campos.', 'error');
            return;
        }
        const id = pendingCommentForEdit.id;
        closeCommentEditModal();
        await patchComment(id, name, message);
    });

    document.getElementById('modal-comment-cancel').addEventListener('click', closeCommentEditModal);

    document.getElementById('modal-edit-comment').addEventListener('click', (e) => {
        if (e.target.id === 'modal-edit-comment') closeCommentEditModal();
    });
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function updateRevealUI() {
    const revealDiv = document.getElementById('revelacao');
    const voteSection = document.querySelector('.vote-section');
    const commentSection = document.querySelector('.comment-container');
    const commentForm = document.getElementById('comment-form');
    const commentLog = document.getElementById('comment-log');
    const balloonContainer = document.querySelector('.balloon-container');

    document.documentElement.style.setProperty('--boy-color', boyColor);
    document.documentElement.style.setProperty('--girl-color', girlColor);
    document.documentElement.style.setProperty('--bg-boy-color', bgBoyColor);
    document.documentElement.style.setProperty('--bg-girl-color', bgGirlColor);
    document.documentElement.style.setProperty('--balloon-color', revealResult === 'girl' ? balloonGirlColor : balloonBoyColor);
    document.documentElement.style.setProperty('--reveal-bg-color', revealResult === 'girl' ? revealBgGirlColor : revealBgBoyColor);
    // Barra do navegador no celular com a mesma cor do topo do gradiente de fundo.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bgGirlColor);

    if (revealResult === 'pending') {
        revealDiv.style.display = 'none';
        voteSection.style.display = 'block';
        commentSection.style.display = 'block';
        commentForm.style.display = 'block';
        commentLog.style.display = 'block';
        balloonContainer.style.display = 'none';

        voteSection.querySelector('h2').style.display = 'block';
        voteSection.querySelector('.input-container').style.display = 'block';
        voteSection.querySelector('.buttons').style.display = 'flex';
    } else {
        revealDiv.style.display = 'block';
        voteSection.style.display = 'block';
        commentSection.style.display = 'block';
        // Depois da revelação é quando os convidados querem parabenizar: o formulário continua aberto.
        commentForm.style.display = 'block';
        commentLog.style.display = 'block';
        balloonContainer.style.display = 'block';

        document.getElementById('comment-title').textContent = '💌 Deixe um recado para o bebê';
        document.getElementById('comment-message').placeholder = 'Escreva seu recado para o bebê e os papais...';

        voteSection.querySelector('h2').style.display = 'none';
        voteSection.querySelector('.input-container').style.display = 'none';
        voteSection.querySelector('.buttons').style.display = 'none';

        const emoji = revealResult === 'girl' ? '🎀' : '🚗';
        revealDiv.innerHTML = `
            ${emoji} ${revealResult === 'girl' ? 'É uma menina!' : 'É um menino!'} ${emoji}
            <br>
            <span style="font-size: 1.5em; font-style: italic;">${revealText}</span>
        `;
        revealDiv.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--reveal-bg-color').trim();
        revealDiv.style.color = 'white';
        startBalloonAndConfettiAnimation();
    }

    document.getElementById('boy-team-name').textContent = babyBoyName;
    document.getElementById('girl-team-name').textContent = babyGirlName;
    ['vote-boy', 'modal-vote-boy'].forEach(id => { document.getElementById(id).textContent = babyBoyName; });
    ['vote-girl', 'modal-vote-girl'].forEach(id => { document.getElementById(id).textContent = babyGirlName; });
}

// Rótulo de cada opção de voto (nomes configurados em BABY_BOY_NAME / BABY_GIRL_NAME).
function genderLabel(gender) {
    return gender === 'boy' ? babyBoyName : babyGirlName;
}

/** Voto deste navegador com o nome indicado (votar de novo com o mesmo nome altera esse voto). */
function findMyVote(name) {
    const formatted = formatName(name || '');
    if (!formatted) return null;
    return votesState.find(v => isBrowserOwner(v.browser_id) && v.name === formatted) || null;
}

/** Destaca o botão do voto atual e mostra "Fulano, você votou em X" para o nome digitado. */
function updateMyVoteUI() {
    const mine = revealResult === 'pending'
        ? findMyVote(document.getElementById('name-input').value)
        : null;

    ['boy', 'girl'].forEach((gender) => {
        const btn = document.getElementById(`vote-${gender}`);
        const selected = mine?.gender === gender;
        btn.classList.toggle('is-selected', selected);
        btn.setAttribute('aria-pressed', String(selected));
    });

    const status = document.getElementById('my-vote');
    status.hidden = !mine;
    if (!mine) return;

    const choice = document.createElement('strong');
    choice.className = mine.gender === 'boy' ? 'boy-text' : 'girl-text';
    choice.textContent = genderLabel(mine.gender);
    status.replaceChildren(
        `${mine.name}, você votou em `, choice,
        '. Toque no outro botão se quiser mudar.'
    );
}

/** Mensagem exibida no lugar de uma lista vazia. */
function renderEmptyState(container, message) {
    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = message;
    container.appendChild(p);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Linha abaixo da barra: quem está na frente, empate ou nenhum voto. */
function scoreStatus(boyVotes, girlVotes) {
    const total = boyVotes + girlVotes;
    if (!total) return 'Nenhum voto ainda';
    const totalText = `${plural(total, 'voto')} no total`;
    if (boyVotes === girlVotes) return `Empate! 🤝 · ${totalText}`;
    const leader = genderLabel(boyVotes > girlVotes ? 'boy' : 'girl');
    return `${leader} na frente por ${plural(Math.abs(boyVotes - girlVotes), 'voto')} · ${totalText}`;
}

function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// Votos já exibidos no histórico (id → time): só votos novos ou que trocaram de time são animados.
let renderedVotes = null;

function renderTeamColumn(gender, votes) {
    const column = document.createElement('div');
    column.className = `team-column team-column--${gender}`;

    const title = document.createElement('h4');
    const label = document.createElement('span');
    label.textContent = `Time ${genderLabel(gender)}`;
    const count = document.createElement('span');
    count.textContent = votes.length;
    title.append(label, count);
    column.appendChild(title);

    if (votes.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'team-column-empty';
        empty.textContent = 'Ninguém ainda';
        column.appendChild(empty);
        return column;
    }

    const list = document.createElement('ul');
    list.className = 'vote-chips';
    votes.forEach((vote) => {
        const chip = document.createElement('li');
        chip.className = 'vote-chip';
        if (renderedVotes && renderedVotes.get(vote.id) !== vote.gender) {
            chip.classList.add('vote-chip--new');
        }

        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = initials(vote.name);

        const name = document.createElement('span');
        name.className = 'chip-name';
        name.textContent = vote.name;
        name.title = vote.name;

        chip.append(avatar, name);

        if (isBrowserOwner(vote.browser_id)) {
            chip.classList.add('entry--mine');
            chip.appendChild(createEntryActionsButton((anchor) => {
                toggleActionsMenu(anchor, { type: 'vote', vote, comment: null });
            }));
        }
        list.appendChild(chip);
    });
    column.appendChild(list);
    return column;
}

function updateUI(votes) {
    document.querySelector('.vote-section').classList.remove('is-loading');

    const boyVotes = votes.filter(v => v.gender === 'boy').length;
    const girlVotes = votes.filter(v => v.gender === 'girl').length;
    const total = boyVotes + girlVotes;

    const boyPct = total ? Math.round(boyVotes / total * 100) : 0;
    // Complemento (e não um segundo arredondamento): os dois somam sempre 100%.
    const girlPct = total ? 100 - boyPct : 0;

    document.getElementById('boy-bar').style.width = `${boyPct}%`;
    document.getElementById('girl-bar').style.width = `${girlPct}%`;
    document.getElementById('boy-count').textContent = boyVotes;
    document.getElementById('girl-count').textContent = girlVotes;
    document.getElementById('boy-pct').textContent = `${boyPct}%`;
    document.getElementById('girl-pct').textContent = `${girlPct}%`;
    document.getElementById('score-status').textContent = scoreStatus(boyVotes, girlVotes);
    document.getElementById('progress').setAttribute('aria-label', total
        ? `${babyBoyName}: ${boyPct}%, ${babyGirlName}: ${girlPct}%`
        : 'Nenhum voto ainda');

    updateMyVoteUI();

    const log = document.getElementById('log');
    log.innerHTML = '';

    if (votes.length === 0) {
        renderEmptyState(log, revealResult === 'pending'
            ? 'Ninguém votou ainda. Seja o primeiro! 🗳️'
            : 'Nenhum voto registrado.');
    } else {
        // Mais recentes no topo de cada coluna.
        const newestFirst = [...votes].reverse();
        log.append(
            renderTeamColumn('boy', newestFirst.filter(v => v.gender === 'boy')),
            renderTeamColumn('girl', newestFirst.filter(v => v.gender === 'girl'))
        );
    }

    renderedVotes = new Map(votes.map(v => [v.id, v.gender]));
}

const relativeTimeFormat = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

/** "agora mesmo", "há 5 minutos", "há 2 horas", "ontem"; depois de uma semana, a data. */
function formatRelativeTime(date) {
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return relativeTimeFormat.format(-minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return relativeTimeFormat.format(-hours, 'hour');
    const days = Math.round(hours / 24);
    if (days < 7) return relativeTimeFormat.format(-days, 'day');
    return date.toLocaleDateString('pt-BR');
}

/** Atualiza os horários relativos já exibidos (chamado a cada minuto). */
function refreshCommentTimes() {
    document.querySelectorAll('#comment-log time[datetime]').forEach((el) => {
        el.textContent = formatRelativeTime(new Date(el.dateTime));
    });
}

// Comentários já exibidos: só os novos ganham animação de entrada.
let renderedCommentIds = null;

function updateCommentUI(comments) {
    const commentLog = document.getElementById('comment-log');
    commentLog.innerHTML = '';

    if (comments.length === 0) {
        renderEmptyState(commentLog, revealResult === 'pending'
            ? 'Nenhum recado ainda. Deixe o primeiro! 💬'
            : 'Nenhum recado ainda. Deixe o primeiro! 💌');
    }

    comments.forEach(comment => {
        const entry = document.createElement('article');
        entry.classList.add('comment-entry');
        if (renderedCommentIds && !renderedCommentIds.has(comment.id)) {
            entry.classList.add('comment-entry--new');
        }

        const avatar = document.createElement('span');
        avatar.className = 'avatar avatar--comment';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = initials(comment.name);

        const body = document.createElement('div');
        body.className = 'comment-body';

        const head = document.createElement('div');
        head.className = 'comment-entry-head';

        const authorSpan = document.createElement('span');
        authorSpan.textContent = comment.name;
        authorSpan.classList.add('author');

        const createdAt = new Date(comment.created_at);
        const time = document.createElement('time');
        time.className = 'timestamp';
        time.dateTime = createdAt.toISOString();
        time.title = createdAt.toLocaleString('pt-BR');
        time.textContent = formatRelativeTime(createdAt);

        head.append(authorSpan, time);

        if (isBrowserOwner(comment.browser_id)) {
            entry.classList.add('entry--mine');
            head.appendChild(createEntryActionsButton((anchor) => {
                toggleActionsMenu(anchor, { type: 'comment', vote: null, comment });
            }));
        }

        const messageP = document.createElement('p');
        messageP.textContent = comment.message;

        body.append(head, messageP);
        entry.append(avatar, body);
        commentLog.appendChild(entry);
    });

    renderedCommentIds = new Set(comments.map(c => c.id));
}

// ─── Config ───────────────────────────────────────────────────────────────────

// No plano gratuito do Render o primeiro pedido acorda o servidor (pode levar ~1 min).
const CONFIG_TIMEOUT_MS = 90000;

async function loadConfig() {
    const response = await fetch(configUrl, { signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS) });

    if (!response.ok) {
        throw new Error('Erro ao carregar configuração. Por favor, tente novamente mais tarde.');
    }

    const config = await response.json();

    apiUrl = config.apiUrl;
    babyBoyName = config.babyBoyName;
    babyGirlName = config.babyGirlName;
    revealResult = config.revealResult;
    enableAutoScroll = config.enableAutoScroll;
    revealText = config.revealText;
    boyColor = config.boyColor;
    bgBoyColor = config.bgBoyColor;
    girlColor = config.girlColor;
    bgGirlColor = config.bgGirlColor;
    balloonBoyColor = config.balloonBoyColor;
    balloonGirlColor = config.balloonGirlColor;
    revealBgBoyColor = config.revealBgBoyColor;
    revealBgGirlColor = config.revealBgGirlColor;

    webSocketUrl = apiUrlToWebSocketUrl(apiUrl);

    updateRevealUI();
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

const CONNECTION_LABELS = {
    connecting: 'Conectando…',
    online: 'Ao vivo',
    offline: 'Reconectando…',
};

function setConnectionStatus(state) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    el.dataset.state = state;
    el.textContent = CONNECTION_LABELS[state];
}

/** Recarrega votos e comentários sem overlay (recupera eventos perdidos enquanto desconectado). */
function refreshAll() {
    return Promise.all([loadVotes(), loadComments()]);
}

/** Remove ou substitui o registo pelo id e devolve a lista reordenada. */
function applyChange(list, { type, data }, compare) {
    const rest = list.filter(item => item.id !== data.id);
    if (type === 'deleted') return rest;
    return [...rest, data].sort(compare);
}

/**
 * Aplica no estado local o evento { resource, type, data } enviado pelo backend.
 * Eventos sem dados (formato antigo do backend) recarregam a lista correspondente.
 */
async function applyRealtimeEvent(event) {
    const isComment = event.resource === 'comments';

    if (!event.type || !event.data) {
        await (isComment ? loadComments() : loadVotes());
        return;
    }

    if (isComment) {
        commentsState = applyChange(commentsState, event, (a, b) => b.id - a.id);
        updateCommentUI(commentsState);
    } else {
        const previous = votesState.find(v => v.id === event.data.id);
        votesState = applyChange(votesState, event, (a, b) => a.id - b.id);
        updateUI(votesState);
        announceVote(event, previous);
    }
}

/** Aviso "ao vivo" para votos de outras pessoas (os próprios já têm a celebração). */
function announceVote({ type, data }, previous) {
    if (isBrowserOwner(data.browser_id)) return;
    const label = genderLabel(data.gender);
    if (type === 'created') {
        showToast(`🎈 ${data.name} votou em ${label}!`, data.gender);
    } else if (type === 'updated' && previous && previous.gender !== data.gender) {
        showToast(`🔄 ${data.name} mudou o voto para ${label}!`, data.gender);
    }
}

function initializeWebSocket() {
    let reconnectDelay = 1000;
    let reconnectTimer = null;
    let socket = null;

    function connect() {
        reconnectTimer = null;
        socket = new WebSocket(webSocketUrl);

        socket.onopen = () => {
            console.log('Conexão com WebSocket estabelecida:', webSocketUrl);
            reconnectDelay = 1000;
            setConnectionStatus('online');
            refreshAll();
        };

        socket.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Mensagem recebida via WebSocket:', data);
                await applyRealtimeEvent(data);
            } catch (err) {
                console.error('Erro ao processar mensagem do WebSocket:', err.message);
            }
        };

        socket.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
        };

        socket.onclose = () => {
            setConnectionStatus('offline');
            console.warn(`Conexão com WebSocket encerrada. Reconectando em ${reconnectDelay / 1000}s...`);
            reconnectTimer = setTimeout(() => {
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
                connect();
            }, reconnectDelay);
        };
    }

    // No celular a ligação cai com a tela bloqueada: ao voltar, reconecta já (sem esperar o backoff)
    // ou, se ainda estiver ligada, busca o que pode ter mudado enquanto a página estava oculta.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectDelay = 1000;
            connect();
        } else if (socket.readyState === WebSocket.OPEN) {
            refreshAll();
        }
    });

    connect();
}

// ─── Votos ────────────────────────────────────────────────────────────────────

async function fetchVotesJson() {
    const response = await fetch(`${apiUrl}/votes`);

    if (!response.ok) {
        throw new Error('Erro ao carregar votos. Por favor, tente novamente mais tarde.');
    }

    return response.json();
}

/** Recarrega os votos sem overlay; falhas só vão para o console (a lista atual continua na tela). */
async function loadVotes() {
    try {
        votesState = await fetchVotesJson();
        updateUI(votesState);
    } catch (err) {
        console.error('Erro ao atualizar votos:', err.message);
    }
}

async function submitVote(name, gender) {
    const formattedName = formatName(name);

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/votes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formattedName, gender, browserId })
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Erro ao registrar voto. Por favor, tente novamente.'));
        }

        // Não depende do WebSocket: se a ligação estiver em baixo, o voto aparece na mesma.
        await loadVotes();
    });
}

async function deleteVote(id) {
    if (!await confirmDialog('Você realmente deseja excluir este voto?')) return;

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/votes/${id}?browserId=${browserId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            console.error('Erro ao excluir voto:', errorMessage);
            throw new Error('Você não tem permissão para excluir este voto.');
        }

        await loadVotes();
    });
    showToast('Voto excluído.', 'success');
}

async function vote(gender) {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();

    if (!name) {
        showToast('Por favor, digite seu nome antes de votar!', 'error');
        nameInput.focus();
        return;
    }

    const previous = findMyVote(name);
    if (previous?.gender === gender) {
        showToast(`Você já votou em ${genderLabel(gender)}! 😉`, gender);
        return;
    }

    await submitVote(name, gender);
    // O nome fica no campo (formatado como no voto, e salvo) para mostrar o voto atual e facilitar o comentário.
    nameInput.value = formatName(name);
    saveGuestName(name);
    fillGuestName(nameInput.value);
    triggerCelebration(gender);
    showToast(previous
        ? `Voto alterado para ${genderLabel(gender)}.`
        : `Voto em ${genderLabel(gender)} registrado! 🎉`, gender);
}

/** Enter no nome: ainda falta escolher o time, então o foco vai para os botões. */
function handleVoteFormSubmit(event) {
    event.preventDefault();
    const nameInput = document.getElementById('name-input');
    if (!nameInput.value.trim()) {
        showToast('Por favor, digite seu nome antes de votar!', 'error');
        return;
    }
    const mine = findMyVote(nameInput.value);
    document.getElementById(mine?.gender === 'girl' ? 'vote-girl' : 'vote-boy').focus();
    if (!mine) showToast(`Agora escolha: ${babyBoyName} ou ${babyGirlName}? 👇`);
}

function triggerCelebration(gender) {
    const confettiContainer = document.createElement('div');
    confettiContainer.classList.add('confetti-container');
    document.body.appendChild(confettiContainer);

    const rootStyles = getComputedStyle(document.documentElement);
    const color = gender === 'boy'
        ? rootStyles.getPropertyValue('--boy-color').trim()
        : rootStyles.getPropertyValue('--girl-color').trim();

    for (let i = 0; i < 10; i++) {
        const balloon = document.createElement('div');
        balloon.classList.add('balloon');
        balloon.style.backgroundColor = color;
        balloon.style.left = `${Math.random() * 100}%`;
        balloon.style.animationDelay = `${Math.random() * 0.5}s`;
        confettiContainer.appendChild(balloon);
    }

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.backgroundColor = Math.random() > 0.5 ? color : '#FFF';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 0.3}s`;
        confettiContainer.appendChild(confetti);
    }

    setTimeout(() => confettiContainer.remove(), 3000);
}

// ─── Comentários ──────────────────────────────────────────────────────────────

async function fetchCommentsJson() {
    const response = await fetch(`${apiUrl}/comments`);

    if (!response.ok) {
        throw new Error('Erro ao carregar comentários. Por favor, tente novamente mais tarde.');
    }

    return response.json();
}

/** Recarrega os comentários sem overlay; falhas só vão para o console (a lista atual continua na tela). */
async function loadComments() {
    try {
        commentsState = await fetchCommentsJson();
        updateCommentUI(commentsState);
    } catch (err) {
        console.error('Erro ao atualizar comentários:', err.message);
    }
}

async function deleteComment(id) {
    if (!await confirmDialog('Você realmente deseja excluir este comentário?')) return;

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/comments/${id}?browserId=${browserId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Você não tem permissão para excluir este comentário.');
        }

        await loadComments();
    });
    showToast('Comentário excluído.', 'success');
}

async function patchComment(id, name, message) {
    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/comments/${id}?browserId=${browserId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, message })
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Erro ao atualizar comentário.'));
        }

        await loadComments();
    });
    showToast('Comentário atualizado.', 'success');
}

async function submitComment(event) {
    event.preventDefault();

    const name = document.getElementById('comment-name').value.trim();
    const message = document.getElementById('comment-message').value.trim();

    if (!name || !message) {
        showToast('Por favor, preencha todos os campos.', 'error');
        return;
    }

    const formattedName = formatName(name);

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formattedName, message, browserId })
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response, 'Erro ao enviar comentário. Por favor, tente novamente mais tarde.'));
        }

        await loadComments();
    });

    document.getElementById('comment-form').reset();
    saveGuestName(formattedName);
    fillGuestName(formattedName);
    showToast('Comentário enviado! 💬', 'success');
}

// ─── Scroll automático ────────────────────────────────────────────────────────

function startAutoScroll(speed, interval) {
    let scrollPosition = 0;
    const maxScrollHeight = () => document.documentElement.scrollHeight - window.innerHeight;
    let scrollingDown = true;

    function scrollPage() {
        const maxHeight = maxScrollHeight();

        if (scrollingDown) {
            if (scrollPosition < maxHeight) {
                scrollPosition += speed;
                window.scrollTo(0, scrollPosition);
                setTimeout(scrollPage, interval);
            } else {
                setTimeout(() => {
                    scrollingDown = false;
                    scrollPage();
                }, 3000);
            }
        } else {
            if (scrollPosition > 0) {
                scrollPosition -= speed;
                window.scrollTo(0, scrollPosition);
                setTimeout(scrollPage, interval);
            } else {
                setTimeout(() => {
                    scrollingDown = true;
                    scrollPage();
                }, 3000);
            }
        }
    }

    scrollPage();
}

// ─── Animação de balões e confetes ────────────────────────────────────────────

function startBalloonAndConfettiAnimation() {
    const balloonContainer = document.querySelector('.balloon-container');
    const MAX_BALLOONS = 50;

    function createBalloon() {
        if (balloonContainer.children.length >= MAX_BALLOONS) {
            balloonContainer.removeChild(balloonContainer.firstChild);
        }

        const balloon = document.createElement('div');
        balloon.classList.add('balloon');
        balloon.style.left = Math.random() * 100 + 'vw';
        balloon.style.animationDuration = Math.random() * 5 + 5 + 's';
        balloon.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--balloon-color').trim();
        balloonContainer.appendChild(balloon);

        balloon.addEventListener('animationend', () => balloon.remove());
    }

    function createConfetti() {
        if (balloonContainer.children.length >= MAX_BALLOONS) {
            balloonContainer.removeChild(balloonContainer.firstChild);
        }

        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = Math.random() * 3 + 2 + 's';
        confetti.style.backgroundColor = 'white';
        balloonContainer.appendChild(confetti);

        confetti.addEventListener('animationend', () => confetti.remove());
    }

    setInterval(() => {
        createBalloon();
        createConfetti();
    }, 500);
}

// ─── Tela de carregamento ─────────────────────────────────────────────────────

// Mensagens exibidas enquanto o servidor não responde (tempo em ms desde a abertura).
const SPLASH_HINTS = [
    { after: 4000, text: 'Na primeira visita o servidor pode levar até um minuto para acordar. Obrigado pela paciência! ☕' },
    { after: 25000, text: 'Quase lá… o servidor está terminando de acordar. 😴' },
];
let splashTimers = [];

function startSplashHints() {
    const hint = document.getElementById('splash-hint');
    splashTimers = SPLASH_HINTS.map(({ after, text }) => setTimeout(() => {
        hint.textContent = text;
        hint.hidden = false;
    }, after));
}

function hideSplash() {
    splashTimers.forEach(clearTimeout);
    document.getElementById('splash').classList.add('splash--hidden');
}

function showSplashError() {
    splashTimers.forEach(clearTimeout);
    const splash = document.getElementById('splash');
    splash.classList.remove('splash--hidden');
    splash.classList.add('splash--error');
    document.getElementById('splash-title').textContent = 'Não foi possível carregar 😕';
    const hint = document.getElementById('splash-hint');
    hint.textContent = 'Verifique sua conexão com a internet e tente novamente.';
    hint.hidden = false;
    document.getElementById('splash-retry').hidden = false;
}

// ─── Inicialização ────────────────────────────────────────────────────────────

async function initializeApp() {
    startSplashHints();
    try {
        configUrl = await resolveConfigUrl();
        await loadConfig();
        // Servidor acordado: o resto é rápido, então a página aparece com esqueletos nas listas.
        hideSplash();
        initializeWebSocket();

        const [votes, comments] = await Promise.all([fetchVotesJson(), fetchCommentsJson()]);
        votesState = votes;
        // Quem votou antes de existir o nome salvo: usa o nome do seu único voto.
        const myVotes = votesState.filter(v => isBrowserOwner(v.browser_id));
        if (myVotes.length === 1) fillGuestName(myVotes[0].name);
        updateUI(votesState);
        commentsState = comments;
        updateCommentUI(commentsState);

        if (revealResult !== 'pending' && enableAutoScroll) {
            startAutoScroll(2, 50);
        }
    } catch (error) {
        console.error('Erro na inicialização da aplicação:', error.message);
        showSplashError();
    }
}

setupContextMenuAndModals();

document.getElementById('vote-form').addEventListener('submit', handleVoteFormSubmit);
document.getElementById('vote-boy').addEventListener('click', () => vote('boy').catch(() => {}));
document.getElementById('vote-girl').addEventListener('click', () => vote('girl').catch(() => {}));
document.getElementById('name-input').addEventListener('input', updateMyVoteUI);
document.getElementById('comment-form').addEventListener('submit', submitComment);
fillGuestName(localStorage.getItem(GUEST_NAME_KEY));
setInterval(refreshCommentTimes, 60 * 1000);
document.getElementById('splash-retry').addEventListener('click', () => window.location.reload());

// Não espera o window.onload (fontes e imagens): o pedido ao servidor começa o quanto antes.
initializeApp();

window.onload = () => {
    const div = document.getElementById('revelacao');
    div.style.opacity = 0;
    let opacity = 0;

    const fadeIn = setInterval(() => {
        opacity += 0.02;
        div.style.opacity = opacity;
        if (opacity >= 1) clearInterval(fadeIn);
    }, 30);
};
