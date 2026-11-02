// Persistência das configurações nas variáveis de ambiente do serviço no Render (API v1).
// Alterar uma variável pela API não vale para o processo em execução nem após um simples reinício:
// é preciso um novo deploy. Por isso, depois de gravar, dispara um deploy sem rebuild.

const RENDER_API_URL = process.env.RENDER_API_URL || 'https://api.render.com/v1';

function isRenderConfigured() {
    return Boolean(process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID);
}

async function renderRequest(method, path, body) {
    const response = await fetch(`${RENDER_API_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Render API ${method} ${path} respondeu ${response.status} ${detail}`.trim());
    }
}

/** Grava as variáveis (uma a uma, sem apagar as outras) e dispara o deploy que as aplica. */
async function persistEnvVars(values) {
    const serviceId = encodeURIComponent(process.env.RENDER_SERVICE_ID);
    for (const [key, value] of Object.entries(values)) {
        await renderRequest('PUT', `/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, { value });
    }
    await renderRequest('POST', `/services/${serviceId}/deploys`, { deployMode: 'deploy_only' });
}

module.exports = { isRenderConfigured, persistEnvVars };
