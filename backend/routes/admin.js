const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { SETTINGS, getSetting, validateSetting } = require('../settings');
const { isRenderConfigured, persistEnvVars } = require('../utils/render');
const { notifyClients } = require('../websocket');

const router = express.Router();

// Só senhas erradas contam (não erros de validação): 5 bloqueiam o IP por 15 minutos.
router.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (req, res) => res.statusCode !== 401,
    message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
}));

/** Compara em tempo constante (os hashes têm o mesmo tamanho, qualquer que seja a senha). */
function passwordMatches(provided) {
    const hash = value => crypto.createHash('sha256').update(value).digest();
    return crypto.timingSafeEqual(hash(provided), hash(process.env.ADMIN_PASSWORD));
}

/** Authorization: Bearer <ADMIN_PASSWORD>. Sem ADMIN_PASSWORD no backend, a configuração fica desligada. */
function requireAdmin(req, res, next) {
    if (!process.env.ADMIN_PASSWORD) {
        return res.status(503).json({ error: 'Página de configuração desativada: defina ADMIN_PASSWORD no backend.' });
    }
    const header = req.get('authorization') || '';
    const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (!provided || !passwordMatches(provided)) {
        return res.status(401).json({ error: 'Senha incorreta.' });
    }
    next();
}

router.use(requireAdmin);

router.get('/settings', (req, res) => {
    res.json({
        settings: SETTINGS.map(s => ({ ...s, value: getSetting(s.key) })),
        // 'render': alterações gravadas no Render; 'memory': valem só até o próximo reinício.
        persistence: isRenderConfigured() ? 'render' : 'memory',
    });
});

router.put('/settings', async (req, res) => {
    const values = req.body && req.body.values;
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
        return res.status(400).json({ error: 'Envie { values: { CHAVE: valor } }.' });
    }

    const changed = {};
    const errors = [];
    for (const [key, raw] of Object.entries(values)) {
        const { value, error } = validateSetting(key, raw);
        if (error) errors.push(error);
        else if (value !== getSetting(key)) changed[key] = value;
    }
    if (errors.length) {
        return res.status(400).json({ error: errors.join(' ') });
    }

    const keys = Object.keys(changed);
    if (!keys.length) {
        return res.json({ applied: [], persisted: 'none' });
    }

    // Vale na hora para este processo e as páginas abertas recarregam a configuração.
    keys.forEach((key) => { process.env[key] = changed[key]; });
    notifyClients({ resource: 'config' });
    console.log(`[ADMIN] Configuração alterada: ${keys.join(', ')}`);

    if (!isRenderConfigured()) {
        return res.json({ applied: keys, persisted: 'memory' });
    }
    try {
        await persistEnvVars(changed);
        res.json({ applied: keys, persisted: 'render' });
    } catch (err) {
        console.error('[ADMIN] Erro ao gravar no Render:', err.message);
        res.json({ applied: keys, persisted: 'error', persistError: 'Aplicado agora, mas não foi possível gravar no Render: o valor volta ao anterior no próximo reinício.' });
    }
});

module.exports = router;
