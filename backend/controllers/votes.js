const pool = require('../db');
const { notifyChange } = require('../websocket');
const { formatName, validateName, selectRowOwnedByBrowser } = require('../utils/helpers');

async function getVotes(req, res) {
    try {
        const result = await pool.query('SELECT * FROM votes ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar votos.' });
    }
}

async function addOrUpdateVote(req, res) {
    const { name, gender, browserId } = req.body;

    if (!name || !gender || !browserId) {
        return res.status(400).json({ error: 'Nome, gênero e identificador do navegador são obrigatórios.' });
    }

    if (!['boy', 'girl'].includes(gender)) {
        return res.status(400).json({ error: 'Gênero inválido. Use "boy" ou "girl".' });
    }

    const nameError = validateName(name);
    if (nameError) {
        return res.status(400).json({ error: nameError });
    }

    const formattedName = formatName(name);

    try {
        const existingVote = await pool.query(
            'SELECT * FROM votes WHERE name = $1 AND browser_id = $2',
            [formattedName, browserId]
        );

        if (existingVote.rows.length > 0) {
            const result = await pool.query(
                'UPDATE votes SET gender = $1 WHERE name = $2 AND browser_id = $3 RETURNING *',
                [gender, formattedName, browserId]
            );
            result.rows.forEach(row => notifyChange('votes', 'updated', row));
        } else {
            const result = await pool.query(
                'INSERT INTO votes (name, gender, browser_id) VALUES ($1, $2, $3) RETURNING *',
                [formattedName, gender, browserId]
            );
            notifyChange('votes', 'created', result.rows[0]);
        }

        res.status(201).json({ message: 'Voto registrado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao registrar voto.' });
    }
}

async function deleteVote(req, res) {
    const { id } = req.params;
    const { browserId } = req.query;

    if (!browserId) {
        return res.status(400).json({ error: 'Identificador do navegador é obrigatório.' });
    }

    try {
        const row = await selectRowOwnedByBrowser(pool, 'votes', id, browserId);

        if (!row) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este voto.' });
        }

        await pool.query('DELETE FROM votes WHERE id = $1', [id]);
        notifyChange('votes', 'deleted', row);
        res.json({ message: 'Voto removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir voto.' });
    }
}

module.exports = { getVotes, addOrUpdateVote, deleteVote };
