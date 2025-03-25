let apiUrl;
let webSocketUrl;
let configUrl;

// Define as URLs de desenvolvimento e produção
const productionUrl = 'https://backend-votebaby.onrender.com/config'; // URL do backend no Render
const developmentUrl = 'http://localhost:3000/config'; // URL do backend local

// Define as URLs de WebSocket para produção e desenvolvimento
const productionWebSocket = 'wss://backend-votebaby.onrender.com'; // WebSocket em produção (Render)
const developmentWebSocket = 'ws://localhost:3000'; // WebSocket em desenvolvimento (local)

// Condicional única para configurar URLs
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // URLs para ambiente de desenvolvimento (local)
    webSocketUrl = developmentWebSocket; // WebSocket local
    configUrl = developmentUrl; // Configuração local
} else {
    // URLs para ambiente de produção
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

    // Mantém o comportamento normal: exibe o splash após 1 segundo
    loadingTimeout = setTimeout(() => {
        showLoading();
    }, 3000); // Splash aparece após 3 segundo

    try {
        // Executa a operação
        await operation();
    } catch (err) {
        console.error('Erro durante operação:', err.message);
        alert(err.message); // Exibe o erro para o usuário
        throw err; // Repassa o erro para que o fluxo continue corretamente
    } finally {
        // Sempre remove o splash
        clearTimeout(loadingTimeout);
        hideLoading();
    }
}

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

// Função principal para iniciar a configuração
async function initializeApp() {
    try {
        await loadConfig();
        initializeWebSocket();
        await loadVotes();
    } catch (error) {
        console.error('Erro na inicialização da aplicação:', error.message);
        alert('Erro ao inicializar a aplicação. Verifique sua conexão.');
    }
}

// Função para inicializar o WebSocket
function initializeWebSocket() {
    const socket = new WebSocket(webSocketUrl);

    socket.onopen = () => {
        console.log('Conexão com WebSocket estabelecida:', webSocketUrl);
    };

    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Mensagem recebida via WebSocket:', data);
            await loadVotes(); // Carrega os votos dinamicamente ao receber mensagens
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

// Chamando a função inicial no evento onload
window.onload = initializeApp;

// Gerar ou recuperar o browserId
let browserId = localStorage.getItem('browserId');
if (!browserId) {
    browserId = crypto.randomUUID(); // Gera um identificador único
    localStorage.setItem('browserId', browserId);
}

async function loadVotes() {
    await withLoading(async () => {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('Erro ao carregar votos. Por favor, tente novamente mais tarde.');
        }

        const votes = await response.json();
        updateUI(votes);
    });
}

async function submitVote(name, gender) {
    const formattedName = name.trim().split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');

    await withLoading(async () => {
        const response = await fetch(apiUrl, {
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

async function deleteVote(id) {
    if (confirm('Você realmente deseja excluir este voto?')) {
        await withLoading(async () => {
            const response = await fetch(`${apiUrl}/${id}`, {
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