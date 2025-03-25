require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000; // Porta do servidor
const API_URL = process.env.API_URL || 'http://localhost:3000/votes'; // URL da API configurável

app.use(express.static('frontend')); // Sirva o frontend diretamente

// Configuração do Pool para conexão com o banco PostgreSQL
const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: { rejectUnauthorized: false }, // Ativa conexão segura para serviços na nuvem
    idleTimeoutMillis: 30000, // 30 segundos antes de encerrar a conexão ociosa
    connectionTimeoutMillis: 2000 // Tempo limite para tentar conectar ao banco
});

// Teste de conexão com o banco de dados
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        process.exit(1); // Finaliza a aplicação em caso de erro
    } else {
        console.log('Conexão com o banco de dados bem-sucedida!');
        release(); // Libera o cliente para o pool
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoint para obter as configurações (URL da API)
app.get('/config', (req, res) => {
    res.json({ apiUrl: API_URL });
});

// Endpoint para obter todos os votos
app.get('/votes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM votes');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar votos:', err.message);
        res.status(500).json({ error: 'Erro ao buscar votos.', details: err.message });
    }
});

// Endpoint para registrar ou atualizar votos
app.post('/votes', async (req, res) => {
    const { name, gender, browserId } = req.body;

    // Validação e formatação de nome: apenas dois primeiros nomes com a primeira letra maiúscula
    const formattedName = name.trim().split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');

    try {
        // Verifica se já existe um voto com o mesmo nome e browserId
        const existingVote = await pool.query('SELECT * FROM votes WHERE name = $1 AND browser_id = $2', [formattedName, browserId]);

        if (existingVote.rows.length > 0) {
            // Atualiza o voto existente
            await pool.query('UPDATE votes SET gender = $1 WHERE name = $2 AND browser_id = $3', [gender, formattedName, browserId]);
            res.json({ message: 'Voto atualizado com sucesso!' });
        } else {
            // Insere um novo voto
            await pool.query('INSERT INTO votes (name, gender, browser_id) VALUES ($1, $2, $3)', [formattedName, gender, browserId]);
            res.status(201).json({ message: 'Voto registrado com sucesso!' });
        }

        // Notifica os clientes WebSocket sobre a atualização
        notifyClients({ action: 'update', name: formattedName, gender });
    } catch (err) {
        console.error('Erro ao registrar ou atualizar voto:', err.message);
        res.status(500).json({ error: 'Erro ao registrar ou atualizar voto.', details: err.message });
    }
});

// Endpoint para excluir votos
app.delete('/votes/:id', async (req, res) => {
    const { id } = req.params;
    const { browserId } = req.body;

    try {
        // Verifica se o voto pertence ao browserId atual
        const result = await pool.query('SELECT * FROM votes WHERE id = $1 AND browser_id = $2', [id, browserId]);

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este voto.' });
        }

        // Exclui o voto
        await pool.query('DELETE FROM votes WHERE id = $1', [id]);
        res.json({ message: 'Voto removido com sucesso!' });

        // Notifica os clientes WebSocket sobre a exclusão
        notifyClients({ action: 'delete', id });
    } catch (err) {
        console.error('Erro ao excluir voto:', err.message);
        res.status(500).json({ error: 'Erro ao excluir voto.', details: err.message });
    }
});

// Inicializa o servidor HTTP para Express
const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Configuração do WebSocket
const wss = new WebSocket.Server({ server }); // Reutiliza o servidor HTTP

wss.on('connection', (ws) => {
    console.log('Cliente conectado via WebSocket');

    ws.on('message', (message) => {
        try {
            console.log(`Mensagem recebida do cliente: ${message}`);
            // Aqui você pode implementar lógica adicional para processar as mensagens do cliente
        } catch (err) {
            console.error('Erro ao processar mensagem do cliente WebSocket:', err.message);
        }
    });

    ws.send(JSON.stringify({ message: 'Conexão WebSocket estabelecida com sucesso!' }));
});

// Função para notificar os clientes conectados via WebSocket
function notifyClients(data) {
    console.log('Enviando dados para os clientes WebSocket:', data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data)); // Envia os dados atualizados para os clientes
        }
    });
}