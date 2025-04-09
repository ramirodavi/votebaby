require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { setupWebSocket } = require('./websocket');
const routes = require('./routes');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(routes);

setupWebSocket(server);

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
