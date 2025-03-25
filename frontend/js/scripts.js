let apiUrl;

// Define as URLs de desenvolvimento e produção
const productionUrl = 'https://backend-votebaby.onrender.com/config'; // URL do backend no Render
const developmentUrl = 'http://localhost:3000/config'; // URL do backend local

async function loadConfig() {
    try {
        // Tenta primeiro a URL de produção
        const response = await fetch(productionUrl);

        if (!response.ok) throw new Error('Falha ao conectar à produção');
        
        const config = await response.json();
        apiUrl = config.apiUrl; // Atribui a URL da API
        console.log('Conectado ao ambiente de produção:', apiUrl);
    } catch (err) {
        console.warn('Erro ao conectar ao ambiente de produção:', err.message);

        try {
            // Se falhar, tenta a URL de desenvolvimento
            const response = await fetch(developmentUrl);

            if (!response.ok) throw new Error('Falha ao conectar ao desenvolvimento');

            const config = await response.json();
            apiUrl = config.apiUrl; // Atribui a URL da API
            console.log('Conectado ao ambiente de desenvolvimento:', apiUrl);
        } catch (err) {
            console.error('Erro ao conectar ao backend em ambos os ambientes:', err.message);
            alert('Erro ao carregar a configuração do backend. Verifique sua conexão.');
        }
    }
}

window.onload = async function () {
    try {
        await loadConfig();
        await loadVotes();
    } catch (err) {
        console.error('Erro ao inicializar a aplicação:', err.message);
        alert('Erro ao inicializar a aplicação. Verifique a conexão com o backend.');
    }
};

// Gerar ou recuperar o browserId
let browserId = localStorage.getItem('browserId');
if (!browserId) {
    browserId = crypto.randomUUID(); // Gera um identificador único
    localStorage.setItem('browserId', browserId);
}

async function loadVotes() {
    try {
        const response = await fetch(apiUrl);
        const votes = await response.json();
        updateUI(votes);
    } catch (err) {
        console.error('Erro ao carregar votos:', err.message);
        alert('Erro ao carregar votos. Por favor, tente novamente mais tarde.');
    }
}

async function submitVote(name, gender) {
    // Extrair e formatar apenas o primeiro e segundo nome
    const formattedName = name.trim().split(' ').slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formattedName, gender, browserId })
        });

        if (response.ok) {
            await loadVotes();
        } else {
            const errorMessage = await response.text();
            console.error('Erro ao registrar voto:', errorMessage);
            alert('Erro ao registrar voto. Por favor, tente novamente.');
        }
    } catch (err) {
        console.error('Erro ao registrar voto:', err.message);
        alert('Erro ao registrar voto. Por favor, tente novamente.');
    }
}

async function deleteVote(id) {
    if (confirm('Você realmente deseja excluir este voto?')) {
        try {
            const response = await fetch(`${apiUrl}/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ browserId })
            });

            if (response.ok) {
                await loadVotes();
            } else {
                const errorMessage = await response.text();
                console.error('Erro ao excluir voto:', errorMessage);
                alert('Você não tem permissão para excluir este voto.');
            }
        } catch (err) {
            console.error('Erro ao excluir voto:', err.message);
            alert('Erro ao excluir voto. Por favor, tente novamente.');
        }
    }
}

function vote(gender) {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Por favor, digite seu nome antes de votar!');
        return;
    }

    submitVote(name, gender);
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