const pool = require('../db');
const { notifyClients } = require('../websocket');
const { formatName, selectRowOwnedByBrowser } = require('../utils/helpers');

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
        await pool.query(
            'INSERT INTO comments (name, message, browser_id) VALUES ($1, $2, $3)',
            [formattedName, message, browserId]
        );
        notifyClients({ resource: 'comments' });
        res.status(201).json({ message: 'Comentário adicionado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao adicionar comentário.' });
    }
}

async function deleteComment(req, res) {
    const { id } = req.params;
    const { browserId } = req.query;

    if (!browserId) {
        return res.status(400).json({ error: 'Identificador do navegador é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM comments WHERE id = $1 AND browser_id = $2',
            [id, browserId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este comentário.' });
        }

        await pool.query('DELETE FROM comments WHERE id = $1', [id]);
        notifyClients({ resource: 'comments' });
        res.json({ message: 'Comentário removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir comentário.' });
    }
}

async function updateComment(req, res) {
    const { id } = req.params;
    const { browserId } = req.query;
    const { name, message } = req.body;

    if (!browserId) {
        return res.status(400).json({ error: 'Identificador do navegador é obrigatório.' });
    }

    if (!name || !message) {
        return res.status(400).json({ error: 'Nome e mensagem são obrigatórios.' });
    }

    const formattedName = formatName(name);

    try {
        const row = await selectRowOwnedByBrowser(pool, 'comments', id, browserId);

        if (!row) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar este comentário.' });
        }

        await pool.query(
            'UPDATE comments SET name = $1, message = $2 WHERE id = $3',
            [formattedName, message, id]
        );
        notifyClients({ resource: 'comments' });
        res.json({ message: 'Comentário atualizado com sucesso!' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Já existe um comentário idêntico para este nome.' });
        }
        res.status(500).json({ error: 'Erro ao atualizar comentário.' });
    }
}

module.exports = { getComments, addComment, deleteComment, updateComment };
