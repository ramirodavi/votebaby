const { getSetting } = require('../settings');

// Manter em sincronia com frontend/index.html (atributos maxlength).
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

// Manter em sincronia com frontend/js/scripts.js (formatName).
function formatName(name) {
    return name.trim().split(/\s+/)
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');
}

/** Retorna a mensagem de erro de validação do nome ou null. */
function validateName(name) {
    const formatted = typeof name === 'string' ? formatName(name) : '';
    if (!formatted) return 'Nome é obrigatório.';
    if (formatted.length > MAX_NAME_LENGTH) return `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`;
    return null;
}

/** Retorna a mensagem de erro de validação do comentário ou null. */
function validateMessage(message) {
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) return 'Mensagem é obrigatória.';
    if (text.length > MAX_MESSAGE_LENGTH) return `O comentário deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres.`;
    return null;
}

/** Comentários novos: sempre antes da revelação; depois dela, só com ALLOW_COMMENTS_AFTER_REVEAL=true. */
function commentsOpen() {
    const revealed = getSetting('REVEAL_RESULT') !== 'pending';
    return !revealed || getSetting('ALLOW_COMMENTS_AFTER_REVEAL') === 'true';
}

/** Apenas tabelas com colunas id e browser_id (whitelist). Retorna a linha ou null. */
async function selectRowOwnedByBrowser(pool, table, id, browserId) {
    if (table !== 'votes' && table !== 'comments') {
        throw new Error('Invalid table');
    }
    const result = await pool.query(
        `SELECT * FROM ${table} WHERE id = $1 AND browser_id = $2`,
        [id, browserId]
    );
    return result.rows[0] || null;
}

module.exports = { formatName, validateName, validateMessage, commentsOpen, selectRowOwnedByBrowser };
