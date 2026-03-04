const pool = require('../db');
const { notifyClients } = require('../websocket');
const { formatName } = require('../utils/helpers');

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

    const formattedName = formatName(name);

    try {
        const existingVote = await pool.query(
            'SELECT * FROM votes WHERE name = $1 AND browser_id = $2',
            [formattedName, browserId]
        );

        if (existingVote.rows.length > 0) {
            await pool.query(
                'UPDATE votes SET gender = $1 WHERE name = $2 AND browser_id = $3',
                [gender, formattedName, browserId]
            );
        } else {
            await pool.query(
                'INSERT INTO votes (name, gender, browser_id) VALUES ($1, $2, $3)',
                [formattedName, gender, browserId]
            );
        }

        notifyClients({ action: 'update', name: formattedName, gender });
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
        const result = await pool.query(
            'SELECT * FROM votes WHERE id = $1 AND browser_id = $2',
            [id, browserId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este voto.' });
        }

        await pool.query('DELETE FROM votes WHERE id = $1', [id]);
        notifyClients({ action: 'delete', id });
        res.json({ message: 'Voto removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao excluir voto.' });
    }
}

module.exports = { getVotes, addOrUpdateVote, deleteVote };
