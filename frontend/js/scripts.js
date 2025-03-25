let apiUrl;
let webSocketUrl;
let configUrl;

// Define as URLs de desenvolvimento e produção
const productionUrl = 'https://backend-votebaby.onrender.com/config'; // URL do backend no Render
const developmentUrl = 'http://localhost:3000/config'; // URL do backend local

// Define as URLs de WebSocket para produção e desenvolvimento
const productionWebSocket = 'wss://backend-votebaby.onrender.com'; // WebSocket em produção (Render)
const developmentWebSocket = 'ws://localhost:3000'; // WebSocket em desenvolvimento (local)

// Configuração dinâmica das URLs
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    webSocketUrl = developmentWebSocket; // WebSocket local
    configUrl = developmentUrl; // Configuração local
} else {
    webSocketUrl = productionWebSocket; // WebSocket em produção
    configUrl = productionUrl; // Configuração em produção
}

// Adiciona o splash de carregamento na página
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

// Remove o splash de carregamento da página
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Envolve uma função assíncrona com o splash e timeout
async function withLoading(operation) {
    let loadingTimeout;

    loadingTimeout = setTimeout(() => {
        showLoading();
    }, 3000); // Exibe o splash após 3 segundos

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

// Gerar ou recuperar o browserId
let browserId = localStorage.getItem('browserId');
if (!browserId) {
    browserId = crypto.randomUUID(); // Gera um identificador único
    localStorage.setItem('browserId', browserId);
}

// Carrega a configuração inicial
async function loadConfig() {
    await withLoading(async () => {
        const response = await fetch(configUrl);

        if (!response.ok) {
            console.warn(`Falha ao carregar configuração. Status: ${response.status}`);
            throw new Error('Erro ao carregar configuração. Por favor, tente novamente mais tarde.');
        }

        const config = await response.json();
        apiUrl = config.apiUrl; // Atribui a URL da API
        console.log(`Configuração carregada com sucesso: ${apiUrl}`);
    });
}

// Inicializa a aplicação
async function initializeApp() {
    try {
        await loadConfig();
        initializeWebSocket();
        await loadVotes();
        await loadComments(); // Carrega os comentários
    } catch (error) {
        console.error('Erro na inicialização da aplicação:', error.message);
        alert('Erro ao inicializar a aplicação. Verifique sua conexão.');
    }
}

// Inicializa o WebSocket
function initializeWebSocket() {
    const socket = new WebSocket(webSocketUrl);

    socket.onopen = () => {
        console.log('Conexão com WebSocket estabelecida:', webSocketUrl);
    };

    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Mensagem recebida via WebSocket:', data);
            await loadVotes();
        } catch (err) {
            console.error('Erro ao processar mensagem do WebSocket:', err.message);
        }
    };

    socket.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
    };

    socket.onclose = () => {
        console.warn('Conexão com WebSocket encerrada');
    };
}

// Carrega os votos
async function loadVotes() {
    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/votes`);

        if (!response.ok) {
            throw new Error('Erro ao carregar votos. Por favor, tente novamente mais tarde.');
        }

        const votes = await response.json();
        updateUI(votes);
    });
}

// Submete um voto
async function submitVote(name, gender) {
    const formattedName = name.trim().split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/votes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formattedName, gender, browserId })
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            console.error('Erro ao registrar voto:', errorMessage);
            throw new Error('Erro ao registrar voto. Por favor, tente novamente.');
        }

        await loadVotes();
    });
}

// Exclui um voto
async function deleteVote(id) {
    if (confirm('Você realmente deseja excluir este voto?')) {
        await withLoading(async () => {
            const response = await fetch(`${apiUrl}/votes/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ browserId })
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                console.error('Erro ao excluir voto:', errorMessage);
                throw new Error('Você não tem permissão para excluir este voto.');
            }

            await loadVotes();
        });
    }
}

async function vote(gender) {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Por favor, digite seu nome antes de votar!');
        return;
    }
    // Envolvendo a operação em withLoading
    await withLoading(async () => {
        await submitVote(name, gender); // Executa o envio do voto
    });

    nameInput.value = '';

    // Inicia animação de celebração
    triggerCelebration(gender);
}

function triggerCelebration(gender) {
    const confettiContainer = document.createElement('div');
    confettiContainer.classList.add('confetti-container');
    document.body.appendChild(confettiContainer);

    // Obtém as variáveis de cor do CSS
    const rootStyles = getComputedStyle(document.documentElement);
    const boyColor = rootStyles.getPropertyValue('--boy-color').trim();
    const girlyColor = rootStyles.getPropertyValue('--girl-color').trim();

    // Escolhe a cor dos balões e confetes com base no gênero
    const color = gender === 'boy' ? boyColor : girlyColor;

    // Animação de balões
    for (let i = 0; i < 10; i++) {
        const balloon = document.createElement('div');
        balloon.classList.add('balloon');
        balloon.style.backgroundColor = color; // Aplica a cor dinâmica
        balloon.style.left = `${Math.random() * 100}%`;
        balloon.style.animationDelay = `${Math.random() * 0.5}s`;

        confettiContainer.appendChild(balloon);
    }

    // Animação de confetes
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.backgroundColor = Math.random() > 0.5 ? color : '#FFF'; // Mistura com branco
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 0.3}s`;

        confettiContainer.appendChild(confetti);
    }

    // Remove os elementos depois de 3 segundos
    setTimeout(() => {
        confettiContainer.remove();
    }, 3000);
}

// Carrega os comentários
async function loadComments() {
    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/comments`);

        if (!response.ok) {
            throw new Error('Erro ao carregar comentários. Por favor, tente novamente mais tarde.');
        }

        const comments = await response.json();
        updateCommentUI(comments);
    });
}

// Exclui um comentário
async function deleteComment(id) {
    const confirmation = confirm('Você realmente deseja excluir este comentário?');

    if (confirmation) {
        const commentsEndpoint = `${apiUrl}/comments/${id}`;

        await withLoading(async () => {
            const response = await fetch(commentsEndpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ browserId }) // Envia o browserId para validação
            });

            if (!response.ok) {
                throw new Error('Você não tem permissão para excluir este comentário.');
            }

            await loadComments();
        });
    }
}

async function submitComment(event) {
    event.preventDefault();

    let name = document.getElementById('comment-name').value.trim();
    const message = document.getElementById('comment-message').value.trim();

    if (!name || !message) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    // Formata o nome: apenas dois primeiros nomes com a inicial maiúscula
    name = name.split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');

    await withLoading(async () => {
        const response = await fetch(`${apiUrl}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                message,
                browserId // Inclui o browserId no envio
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao enviar comentário. Por favor, tente novamente mais tarde.');
        }

        await loadComments(); // Recarrega os comentários após o envio
    });

    document.getElementById('comment-form').reset(); // Limpa o formulário após o envio
}

// Atualiza os comentários na interface
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

        // Permitir exclusão ao clicar no comentário
        entry.onclick = () => deleteComment(comment.id);

        entry.appendChild(authorSpan);
        entry.appendChild(messageP);
        entry.appendChild(timestampSpan);

        commentLog.appendChild(entry);
    });
}

// Atualiza UI dos votos
function updateUI(votes) {
    const boyVotes = votes.filter(v => v.gender === 'boy').length;
    const girlVotes = votes.filter(v => v.gender === 'girl').length;

    document.getElementById('boy-bar').style.width = `${(boyVotes / (boyVotes + girlVotes)) * 100 || 0}%`;
    document.getElementById('girl-bar').style.width = `${(girlVotes / (boyVotes + girlVotes)) * 100 || 0}%`;

    document.getElementById('boy-bar').textContent = `${Math.round((boyVotes / (boyVotes + girlVotes)) * 100) || 0}%`;
    document.getElementById('girl-bar').textContent = `${Math.round((girlVotes / (boyVotes + girlVotes)) * 100) || 0}%`;

    document.getElementById('boy-count').textContent = boyVotes;
    document.getElementById('girl-count').textContent = girlVotes;

    const log = document.getElementById('log');
    log.innerHTML = '';
    votes.forEach(vote => {
        const entry = document.createElement('div');
        entry.classList.add('vote-entry');
        entry.onclick = () => deleteVote(vote.id);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = vote.name;
        nameSpan.classList.add('bold');

        const textSpan = document.createElement('span');
        textSpan.textContent = ' votou em ';

        const genderSpan = document.createElement('span');
        genderSpan.textContent = vote.gender === 'boy' ? 'Menino' : 'Menina';
        genderSpan.classList.add('bold', vote.gender === 'boy' ? 'boy-text' : 'girl-text');

        entry.appendChild(nameSpan);
        entry.appendChild(textSpan);
        entry.appendChild(genderSpan);
        log.appendChild(entry);
    });
}

// Inicializa o quadro de comentários
document.getElementById('comment-form').addEventListener('submit', submitComment);

// Inicializa a aplicação ao carregar a página
window.onload = initializeApp;