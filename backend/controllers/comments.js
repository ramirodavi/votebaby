const pool = require('../db');
const { notifyChange } = require('../websocket');
const { formatName, validateName, validateMessage, commentsOpen, selectRowOwnedByBrowser } = require('../utils/helpers');

const DUPLICATE_COMMENT_ERROR = 'Já existe um comentário idêntico para este nome.';

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

    // Também no servidor: uma página aberta antes da revelação ainda mostraria o formulário.
    if (!commentsOpen()) {
        return res.status(403).json({ error: 'Os comentários foram encerrados após a revelação.' });
    }

    if (!name || !message) {
        return res.status(400).json({ error: 'Nome e mensagem são obrigatórios.' });
    }

    const validationError = validateName(name) || validateMessage(message);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const formattedName = formatName(name);

    try {
        const result = await pool.query(
            'INSERT INTO comments (name, message, browser_id) VALUES ($1, $2, $3) RETURNING *',
            [formattedName, message.trim(), browserId]
        );
        notifyChange('comments', 'created', result.rows[0]);
        res.status(201).json({ message: 'Comentário adicionado com sucesso!' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: DUPLICATE_COMMENT_ERROR });
        }
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
        const row = await selectRowOwnedByBrowser(pool, 'comments', id, browserId);

        if (!row) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este comentário.' });
        }

        await pool.query('DELETE FROM comments WHERE id = $1', [id]);
        notifyChange('comments', 'deleted', row);
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

    const validationError = validateName(name) || validateMessage(message);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const formattedName = formatName(name);

    try {
        const row = await selectRowOwnedByBrowser(pool, 'comments', id, browserId);

        if (!row) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar este comentário.' });
        }

        const result = await pool.query(
            'UPDATE comments SET name = $1, message = $2 WHERE id = $3 RETURNING *',
            [formattedName, message.trim(), id]
        );
        notifyChange('comments', 'updated', result.rows[0]);
        res.json({ message: 'Comentário atualizado com sucesso!' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: DUPLICATE_COMMENT_ERROR });
        }
        res.status(500).json({ error: 'Erro ao atualizar comentário.' });
    }
}

module.exports = { getComments, addComment, deleteComment, updateComment };
