let apiUrl;
let webSocketUrl;
let configUrl;

// Define as URLs de desenvolvimento e produção
const productionUrl = 'https://backend-votebaby.onrender.com/config';
const developmentUrl = 'http://localhost:3000/config';

const productionWebSocket = 'wss://backend-votebaby.onrender.com';
const developmentWebSocket = 'ws://localhost:3000';

// Configuração dinâmica das URLs com base no ambiente
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    webSocketUrl = developmentWebSocket;
    configUrl = developmentUrl;
} else {
    webSocketUrl = productionWebSocket;
    configUrl = productionUrl;
}

// Exibe o splash de carregamento
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

// Remove o splash de carregamento
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Envolve uma operação assíncrona com o splash de carregamento
async function withLoading(operation) {
    if (typeof operation !== 'function') {
        console.warn('Nenhuma operação válida foi passada para withLoading.');
        return;
    }
    let loadingTimeout = setTimeout(() => showLoading(), 3000);

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

// Gera ou recupera o identificador único do navegador
let browserId = localStorage.getItem('browserId');
if (!browserId) {
    browserId = crypto.randomUUID();
    localStorage.setItem('browserId', browserId);
}

// Variáveis de configuração padrão
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

// Atualiza a interface com base nas configurações carregadas
function updateRevealUI() {
    const revealDiv = document.getElementById('revelacao');
    const voteSection = document.querySelector('.vote-section');
    const commentSection = document.querySelector('.comment-container');
    const commentForm = document.getElementById('comment-form');
    const commentLog = document.getElementById('comment-log');
    const balloonContainer = document.querySelector('.balloon-container');

    // Define as cores dinamicamente no :root
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

        // Mostra os itens da seção de votação
        voteSection.querySelector('h2').style.display = 'block';
        voteSection.querySelector('.input-container').style.display = 'block';
        voteSection.querySelector('.buttons').style.display = 'flex';
    } else {
        revealDiv.style.display = 'block';
        voteSection.style.display = 'block'; // Mantém a seção visível
        commentSection.style.display = 'block';
        commentForm.style.display = 'none';
        commentLog.style.display = 'block';
        balloonContainer.style.display = 'block';

        // Oculta os itens especificados da seção de votação
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

// Função para carregar a configuração inicial do backend
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

        updateRevealUI();
    });
}

// Função de Scroll Automático
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

// Inicializa a aplicação
async function initializeApp() {
    try {
        await loadConfig();
        initializeWebSocket();
        await loadVotes();
        await loadComments();

        if (revealResult !== 'pending' && enableAutoScroll) {
            startAutoScroll(2, 50); // Velocidade e intervalo padrão
        }
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
    await withLoading(async () => {
        await submitVote(name, gender);
    });

    nameInput.value = '';

    triggerCelebration(gender);
}

function triggerCelebration(gender) {
    const confettiContainer = document.createElement('div');
    confettiContainer.classList.add('confetti-container');
    document.body.appendChild(confettiContainer);

    const rootStyles = getComputedStyle(document.documentElement);
    const boyColor = rootStyles.getPropertyValue('--boy-color').trim();
    const girlyColor = rootStyles.getPropertyValue('--girl-color').trim();

    const color = gender === 'boy' ? boyColor : girlyColor;

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
                body: JSON.stringify({ browserId })
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
                browserId
            })
        });

        if (!response.ok) {
            throw new Error('Erro ao enviar comentário. Por favor, tente novamente mais tarde.');
        }

        await loadComments();
    });

    document.getElementById('comment-form').reset();
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

document.addEventListener("DOMContentLoaded", () => {
    const balloonContainer = document.querySelector(".balloon-container");

    function createBalloon() {
        const balloon = document.createElement("div");
        balloon.classList.add("balloon");
        balloon.style.left = Math.random() * 100 + "vw";
        balloon.style.animationDuration = Math.random() * 5 + 5 + "s";
        balloon.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--balloon-color').trim();
        balloonContainer.appendChild(balloon);

        balloon.addEventListener("animationend", () => {
            balloon.remove();
        });
    }

    function createConfetti() {
        const confetti = document.createElement("div");
        confetti.classList.add("confetti");
        confetti.style.left = Math.random() * 100 + "vw";
        confetti.style.animationDuration = Math.random() * 3 + 2 + "s";
        confetti.style.backgroundColor = "white";
        balloonContainer.appendChild(confetti);

        confetti.addEventListener("animationend", () => {
            confetti.remove();
        });
    }

    if (revealResult !== 'pending') {
        setInterval(() => {
            createBalloon();
            createConfetti();
        }, 500);
    }
});

// Inicia a animação de balões e confetes
function startBalloonAndConfettiAnimation() {
    const balloonContainer = document.querySelector(".balloon-container");

    // Define o número máximo de balões visíveis
    const MAX_BALLOONS = 50;

    // Função para criar balões e confetes com limite
    function createBalloon() {
        // Remove balões antigos se o limite for atingido
        if (balloonContainer.children.length >= MAX_BALLOONS) {
            balloonContainer.removeChild(balloonContainer.firstChild);
        }

        const balloon = document.createElement("div");
        balloon.classList.add("balloon");
        balloon.style.left = Math.random() * 100 + "vw";
        balloon.style.animationDuration = Math.random() * 5 + 5 + "s";
        balloon.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--balloon-color').trim();
        balloonContainer.appendChild(balloon);

        // Remove o balão após a animação
        balloon.addEventListener("animationend", () => {
            balloon.remove();
        });
    }

    function createConfetti() {
        // Remove confetes antigos se o limite for atingido
        if (balloonContainer.children.length >= MAX_BALLOONS) {
            balloonContainer.removeChild(balloonContainer.firstChild);
        }

        const confetti = document.createElement("div");
        confetti.classList.add("confetti");
        confetti.style.left = Math.random() * 100 + "vw";
        confetti.style.animationDuration = Math.random() * 3 + 2 + "s";
        confetti.style.backgroundColor = "white"; // Cor fixa para confetes
        balloonContainer.appendChild(confetti);

        // Remove o confete após a animação
        confetti.addEventListener("animationend", () => {
            confetti.remove();
        });
    }

    // Gera balões e confetes em intervalos regulares
    setInterval(() => {
        createBalloon();
        createConfetti();
    }, 500);
}