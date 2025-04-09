const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const useragent = require('useragent');

let clients = [];

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const clientId = uuidv4();
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = useragent.parse(req.headers['user-agent']);
        clients.push(ws);

        console.log(`Cliente conectado: ${clientId}, IP: ${clientIp}, Navegador: ${userAgent.family}`);

        ws.on('close', () => {
            clients = clients.filter(client => client !== ws);
            console.log(`Cliente desconectado: ${clientId}`);
        });
    });
}

function notifyClients(data) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

module.exports = { setupWebSocket, notifyClients };
