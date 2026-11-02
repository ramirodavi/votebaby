const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

let clients = [];

// Só para o log das conexões (antes vinha do pacote "useragent", abandonado e com dependência vulnerável).
// A ordem importa: Edge, Opera e Samsung também anunciam "Chrome"; quase todos anunciam "Safari".
const BROWSERS = [
    ['Edge', /Edg(?:A|iOS)?\/(\d+)/],
    ['Opera', /OPR\/(\d+)/],
    ['Samsung Internet', /SamsungBrowser\/(\d+)/],
    ['HeadlessChrome', /HeadlessChrome\/(\d+)/],
    ['Chrome', /(?:Chrome|CriOS)\/(\d+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
    ['Safari', /Version\/(\d+)[\d.]* .*Safari/],
];

const SYSTEMS = [
    ['iOS', /(?:iPhone|iPad|iPod).* OS (\d+)_?(\d+)?/],
    ['Android', /Android (\d+)(?:\.(\d+))?/],
    ['Windows', /Windows NT (\d+)\.(\d+)/],
    ['ChromeOS', /CrOS/],
    ['macOS', /Mac OS X (\d+)[_.](\d+)/],
    ['Linux', /Linux/],
];

/** Navegador, sistema e tipo de aparelho a partir do cabeçalho User-Agent. */
function describeUserAgent(ua = '') {
    const find = list => list.map(([name, re]) => [name, ua.match(re)]).find(([, m]) => m);
    const [browser, browserMatch] = find(BROWSERS) || ['Desconhecido', null];
    const [os, osMatch] = find(SYSTEMS) || ['Desconhecido', null];
    const osVersion = osMatch && osMatch[1] ? osMatch.slice(1).filter(Boolean).join('.') : 'desconhecida';

    let device = 'Desktop/Genérico';
    if (/iPhone/.test(ua)) device = 'iPhone';
    else if (/iPad/.test(ua)) device = 'iPad';
    else if (/Android/.test(ua)) device = /Mobile/.test(ua) ? 'Celular Android' : 'Tablet Android';

    return { browser, browserVersion: browserMatch ? browserMatch[1] : 'desconhecida', os, osVersion, device };
}

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        const clientId = uuidv4();
        const connectedAt = Date.now();
        const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconhecido').split(',')[0].trim();
        const { browser, browserVersion, os, osVersion, device } = describeUserAgent(req.headers['user-agent']);

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

/**
 * Evento de alteração com o registo completo, para o frontend aplicar sem novo GET.
 * Formato: { resource: 'votes' | 'comments', type: 'created' | 'updated' | 'deleted', data: linha }.
 */
function notifyChange(resource, type, data) {
    notifyClients({ resource, type, data });
}

module.exports = { setupWebSocket, notifyClients, notifyChange };
