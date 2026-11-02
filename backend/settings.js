// Parâmetros do .env que podem ser alterados pela página de configuração (frontend/admin.html).
// Infraestrutura e segredos (PG_*, NODE_ENV, PORT, FRONTEND_URL, ADMIN_PASSWORD, RENDER_*) ficam de fora
// de propósito: um valor errado neles derrubaria o backend, e com ele a própria página de configuração.

const SETTINGS = [
    { key: 'REVEAL_RESULT', type: 'enum', options: ['pending', 'boy', 'girl'], default: 'pending' },
    { key: 'REVEAL_TEXT', type: 'text', maxLength: 120, default: '' },
    { key: 'ALLOW_COMMENTS_AFTER_REVEAL', type: 'boolean', default: 'false' },
    { key: 'BABY_BOY_NAME', type: 'text', maxLength: 30, required: true, default: 'Menino' },
    { key: 'BABY_GIRL_NAME', type: 'text', maxLength: 30, required: true, default: 'Menina' },
    { key: 'BOY_COLOR', type: 'color', default: 'rgb(58, 177, 98)' },
    { key: 'GIRL_COLOR', type: 'color', default: 'rgb(219, 130, 207)' },
    { key: 'BG_BOY_COLOR', type: 'color', default: 'rgb(172, 241, 197)' },
    { key: 'BG_GIRL_COLOR', type: 'color', default: 'rgb(231, 179, 223)' },
    { key: 'BALLOON_BOY_COLOR', type: 'color', default: 'rgb(58, 177, 98)' },
    { key: 'BALLOON_GIRL_COLOR', type: 'color', default: 'rgb(219, 130, 207)' },
    { key: 'REVEAL_BG_BOY_COLOR', type: 'color', default: 'rgb(172, 241, 197)' },
    { key: 'REVEAL_BG_GIRL_COLOR', type: 'color', default: 'rgb(231, 179, 223)' },
];

const SETTINGS_BY_KEY = new Map(SETTINGS.map(s => [s.key, s]));

/** Valor atual (variável de ambiente ou padrão), sempre como string, como no .env. */
function getSetting(key) {
    const setting = SETTINGS_BY_KEY.get(key);
    const value = process.env[key];
    return value === undefined || value === '' ? setting.default : value;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const RGB_COLOR = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;

function isValidColor(value) {
    if (HEX_COLOR.test(value)) return true;
    const match = value.match(RGB_COLOR);
    return !!match && match.slice(1).every(n => Number(n) <= 255);
}

/** Normaliza e valida um valor recebido. Retorna { value } ou { error }. */
function validateSetting(key, raw) {
    const setting = SETTINGS_BY_KEY.get(key);
    if (!setting) return { error: `Parâmetro desconhecido ou não editável: ${key}.` };

    if (setting.type === 'boolean') {
        if (raw === true || raw === 'true') return { value: 'true' };
        if (raw === false || raw === 'false') return { value: 'false' };
        return { error: `${key}: use verdadeiro ou falso.` };
    }

    if (typeof raw !== 'string') return { error: `${key}: valor inválido.` };
    const value = raw.trim();

    switch (setting.type) {
        case 'enum':
            return setting.options.includes(value)
                ? { value }
                : { error: `${key}: use ${setting.options.join(', ')}.` };
        case 'color':
            return isValidColor(value)
                ? { value }
                : { error: `${key}: cor inválida (use #rrggbb ou rgb(r, g, b)).` };
        case 'text':
            if (setting.required && !value) return { error: `${key}: não pode ficar vazio.` };
            if (value.length > setting.maxLength) return { error: `${key}: no máximo ${setting.maxLength} caracteres.` };
            return { value };
        default:
            return { error: `${key}: tipo não suportado.` };
    }
}

module.exports = { SETTINGS, getSetting, validateSetting };
