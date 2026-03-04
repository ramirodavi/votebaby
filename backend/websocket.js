const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const useragent = require('useragent');

let clients = [];

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const clientId = uuidv4();
        const connectedAt = Date.now();
        const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconhecido').split(',')[0].trim();
        const ua = useragent.parse(req.headers['user-agent']);

        const browser = ua.family || 'Desconhecido';
        const browserVersion = ua.toVersion() || 'desconhecida';
        const os = ua.os.family || 'Desconhecido';
        const osVersion = ua.os.toVersion() || 'desconhecida';
        const device = ua.device.family !== 'Other' ? ua.device.family : 'Desktop/Genérico';

        const clientEntry = { ws, clientId, ip: clientIp, browser, browserVersion, os, osVersion, device, connectedAt };
        clients.push(clientEntry);

        console.log(
            `[WS] Conexão | ID: ${clientId} | IP: ${clientIp} | ` +
            `Navegador: ${browser} ${browserVersion} | ` +
            `OS: ${os} ${osVersion} | ` +
            `Device: ${device} | ` +
            `Conectados: ${clients.length} | ` +
            `Hora: ${new Date(connectedAt).toISOString()}`
        );

        ws.on('close', () => {
            const durationSecs = Math.round((Date.now() - connectedAt) / 1000);
            clients = clients.filter(c => c.clientId !== clientId);

            console.log(
                `[WS] Desconexão | ID: ${clientId} | IP: ${clientIp} | ` +
                `Navegador: ${browser} ${browserVersion} | ` +
                `OS: ${os} ${osVersion} | ` +
                `Device: ${device} | ` +
                `Duração: ${durationSecs}s | ` +
                `Conectados: ${clients.length}`
            );
        });
    });
}

function notifyClients(data) {
    clients.forEach(({ ws }) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    });
}

module.exports = { setupWebSocket, notifyClients };
