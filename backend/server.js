require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { setupWebSocket } = require('./websocket');
const routes = require('./routes');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
};

const postLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Muitas requisições. Tente novamente em um minuto.' },
});

app.use(cors(corsOptions));
app.use(express.json());
app.use('/votes', postLimiter);
app.use('/comments', postLimiter);
app.use(routes);

setupWebSocket(server);

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
