// Manter em sincronia com frontend/js/scripts.js (formatName).
function formatName(name) {
    return name.trim().split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');
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

module.exports = { formatName, selectRowOwnedByBrowser };
