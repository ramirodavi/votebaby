require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { setupWebSocket } = require('./websocket');
const routes = require('./routes');

const app = express();
app.set('trust proxy', 1);
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
};

// Só limita escritas: leituras são disparadas em todos os clientes a cada evento do WebSocket
// e, na festa, os convidados costumam partilhar o mesmo IP (Wi-Fi do local).
const WRITE_METHODS = ['POST', 'PATCH', 'DELETE'];

const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    skip: (req) => !WRITE_METHODS.includes(req.method),
    message: { error: 'Muitas requisições. Tente novamente em um minuto.' },
});

app.use(cors(corsOptions));
app.use(express.json());
app.use('/votes', writeLimiter);
app.use('/comments', writeLimiter);
app.use(routes);

setupWebSocket(server);

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
