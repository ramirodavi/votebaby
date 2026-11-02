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
        alert(err.message);
        throw err;
    } finally {
        clearTimeout(loadingTimeout);
        hideLoading();
    }
}

// ─── Identificador do navegador ───────────────────────────────────────────────

let browserId = localStorage.getItem('browserId');
if (!browserId) {
    browserId = crypto.randomUUID();
    localStorage.setItem('browserId', browserId);
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
    const el = document.getElementById('modal-edit-vote');
    if (el) el.hidden = true;
    pendingVoteForEdit = null;
}

function closeCommentEditModal() {
    const el = document.getElementById('modal-edit-comment');
    if (el) el.hidden = true;
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

            if (action === 'edit') {
                if (type === 'vote' && vote) {
                    pendingVoteForEdit = vote;
                    hideContextMenu();
                    document.getElementById('modal-edit-vote').hidden = false;
                } else if (type === 'comment' && comment) {
                    pendingCommentForEdit = comment;
                    hideContextMenu();
                    document.getElementById('modal-comment-name').value = comment.name;
                    document.getElementById('modal-comment-message').value = comment.message;
                    document.getElementById('modal-edit-comment').hidden = false;
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
        }
    });

    document.getElementById('modal-vote-boy').addEventListener('click', async () => {
        if (!pendingVoteForEdit) return;
        const v = pendingVoteForEdit;
        closeVoteEditModal();
        await submitVote(v.name, 'boy');
    });

    document.getElementById('modal-vote-girl').addEventListener('click', async () => {
        if (!pendingVoteForEdit) return;
        const v = pendingVoteForEdit;
        closeVoteEditModal();
        await submitVote(v.name, 'girl');
    });

    document.getElementById('modal-vote-cancel').addEventListener('click', closeVoteEditModal);

    document.getElementById('modal-edit-vote').addEventListener('click', (e) => {
        if (e.target.id === 'modal-edit-vote') closeVoteEditModal();
    });

    document.getElementById('modal-comment-save').addEventListener('click', async () => {
        if (!pendingCommentForEdit) return;
        const name = document.getElementById('modal-comment-name').value.trim();
        const message = document.getElementById('modal-comment-message').value.trim();
        if (!name || !message) {
            alert('Por favor, preencha todos os campos.');
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
        commentForm.style.display = 'none';
        commentLog.style.display = 'block';
        balloonContainer.style.display = 'block';

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

    document.querySelector('.boy-name strong').textContent = `${babyBoyName}:`;
    document.querySelector('.girl-name strong').textContent = `${babyGirlName}:`;
}

function updateUI(votes) {
    const boyVotes = votes.filter(v => v.gender === 'boy').length;
    const girlVotes = votes.filter(v => v.gender === 'girl').length;
    const total = boyVotes + girlVotes;

    const boyPct = total ? Math.round(boyVotes / total * 100) : 0;
    const girlPct = total ? Math.round(girlVotes / total * 100) : 0;

    const boyBar = document.getElementById('boy-bar');
    const girlBar = document.getElementById('girl-bar');

    boyBar.style.width = `${boyPct}%`;
    boyBar.textContent = `${boyPct}%`;
    girlBar.style.width = `${girlPct}%`;
    girlBar.textContent = `${girlPct}%`;

    document.getElementById('boy-count').textContent = boyVotes;
    document.getElementById('girl-count').textContent = girlVotes;

    const log = document.getElementById('log');
    log.innerHTML = '';

    votes.forEach(vote => {
        const entry = document.createElement('div');
        entry.classList.add('vote-entry');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = vote.name;
        nameSpan.classList.add('bold');

        const textSpan = document.createElement('span');
        textSpan.textContent = ' votou em ';

        const genderSpan = document.createElement('span');
        genderSpan.textContent = vote.gender === 'boy' ? 'Menino' : 'Menina';
        genderSpan.classList.add('bold', vote.gender === 'boy' ? 'boy-text' : 'girl-text');

        if (isBrowserOwner(vote.browser_id)) {
            entry.classList.add('entry--mine');
            const content = document.createElement('div');
            content.className = 'entry-content';
            content.appendChild(nameSpan);
            content.appendChild(textSpan);
            content.appendChild(genderSpan);
            const btn = createEntryActionsButton((anchor) => {
                toggleActionsMenu(anchor, { type: 'vote', vote, comment: null });
            });
            entry.appendChild(content);
            entry.appendChild(btn);
        } else {
            entry.appendChild(nameSpan);
            entry.appendChild(textSpan);
            entry.appendChild(genderSpan);
        }
        log.appendChild(entry);
    });
}

function updateCommentUI(comments) {
    const commentLog = document.getElementById('comment-log');
    commentLog.innerHTML = '';

    comments.forEach(comment => {
        const entry = document.createElement('div');
        entry.classList.add('comment-entry');

        const authorSpan = document.createElement('span');
        authorSpan.textContent = comment.name;
        authorSpan.classList.add('author');

        const messageP = document.createElement('p');
        messageP.textContent = comment.message;

        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = new Date(comment.created_at).toLocaleString();
        timestampSpan.classList.add('timestamp');

        if (isBrowserOwner(comment.browser_id)) {
            entry.classList.add('entry--mine');
            const head = document.createElement('div');
            head.className = 'comment-entry-head';
            head.appendChild(authorSpan);
            const btn = createEntryActionsButton((anchor) => {
                toggleActionsMenu(anchor, { type: 'comment', vote: null, comment });
            });
            head.appendChild(btn);
            entry.appendChild(head);
        } else {
            entry.appendChild(authorSpan);
        }
        entry.appendChild(messageP);
        entry.appendChild(timestampSpan);

        commentLog.appendChild(entry);
    });
}

// ─── Config ───────────────────────────────────────────────────────────────────

async function loadConfig() {
    await withLoading(async () => {
        const response = await fetch(configUrl);

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
    });
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
    return Promise.all([loadVotes({ silent: true }), loadComments({ silent: true })]);
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
                if (data.resource === 'comments') {
                    await loadComments({ silent: true });
                } else {
                    await loadVotes({ silent: true });
                }
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

async function loadVotes(options = {}) {
    const silent = options.silent === true;

    if (silent) {
        try {
            const votes = await fetchVotesJson();
            updateUI(votes);
        } catch (err) {
            console.error('Erro ao atualizar votos:', err.message);
        }
        return;
    }

    await withLoading(async () => {
        const votes = await fetchVotesJson();
        updateUI(votes);
    });
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
        await loadVotes({ silent: true });
    });
}

async function deleteVote(id) {
    if (!confirm('Você realmente deseja excluir este voto?')) return;

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/votes/${id}?browserId=${browserId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            console.error('Erro ao excluir voto:', errorMessage);
            throw new Error('Você não tem permissão para excluir este voto.');
        }

        await loadVotes({ silent: true });
    });
}

async function vote(gender) {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Por favor, digite seu nome antes de votar!');
        return;
    }

    await submitVote(name, gender);
    nameInput.value = '';
    triggerCelebration(gender);
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

async function loadComments(options = {}) {
    const silent = options.silent === true;

    if (silent) {
        try {
            const comments = await fetchCommentsJson();
            updateCommentUI(comments);
        } catch (err) {
            console.error('Erro ao atualizar comentários:', err.message);
        }
        return;
    }

    await withLoading(async () => {
        const comments = await fetchCommentsJson();
        updateCommentUI(comments);
    });
}

async function deleteComment(id) {
    if (!confirm('Você realmente deseja excluir este comentário?')) return;

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/comments/${id}?browserId=${browserId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error('Você não tem permissão para excluir este comentário.');
        }

        await loadComments({ silent: true });
    });
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

        await loadComments({ silent: true });
    });
}

async function submitComment(event) {
    event.preventDefault();

    const name = document.getElementById('comment-name').value.trim();
    const message = document.getElementById('comment-message').value.trim();

    if (!name || !message) {
        alert('Por favor, preencha todos os campos.');
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

        await loadComments({ silent: true });
    });

    document.getElementById('comment-form').reset();
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

// ─── Inicialização ────────────────────────────────────────────────────────────

async function initializeApp() {
    try {
        configUrl = await resolveConfigUrl();
        await loadConfig();
        initializeWebSocket();
        await loadVotes();
        await loadComments();

        if (revealResult !== 'pending' && enableAutoScroll) {
            startAutoScroll(2, 50);
        }
    } catch (error) {
        console.error('Erro na inicialização da aplicação:', error.message);
        alert('Erro ao inicializar a aplicação. Verifique sua conexão.');
    }
}

setupContextMenuAndModals();

document.getElementById('comment-form').addEventListener('submit', submitComment);

window.onload = () => {
    initializeApp();

    const div = document.getElementById('revelacao');
    div.style.opacity = 0;
    let opacity = 0;

    const fadeIn = setInterval(() => {
        opacity += 0.02;
        div.style.opacity = opacity;
        if (opacity >= 1) clearInterval(fadeIn);
    }, 30);
};
