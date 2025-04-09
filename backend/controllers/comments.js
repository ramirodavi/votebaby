const pool = require('../db');

async function getComments(req, res) {
    try {
        const result = await pool.query('SELECT * FROM comments ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar comentários.' });
    }
}

async function addComment(req, res) {
    const { name, message, browserId } = req.body;

    if (!name || !message) {
        return res.status(400).json({ error: 'Nome e mensagem são obrigatórios.' });
    }

    const formattedName = formatName(name);

    try {
        await pool.query('INSERT INTO comments (name, message, browser_id) VALUES ($1, $2, $3)', [formattedName, message, browserId]);
        res.status(201).json({ message: 'Comentário adicionado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao adicionar comentário.' });
    }
}

async function deleteComment(req, res) {
    const { id } = req.params;
    const { browserId } = req.body;

    try {
        const result = await pool.query('SELECT * FROM comments WHERE id = $1 AND browser_id = $2', [id, browserId]);

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este comentário.' });
        }

        await pool.query('DELETE FROM comments WHERE id = $1', [id]);
        res.json({ message: 'Comentário removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir comentário.' });
    }
}

function formatName(name) {
    return name.trim().split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');
}

module.exports = { getComments, addComment, deleteComment };
