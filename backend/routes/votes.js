const express = require('express');
const { getVotes, addOrUpdateVote, deleteVote } = require('../controllers/votes');

const router = express.Router();

router.get('/', getVotes);
router.post('/', addOrUpdateVote);
router.delete('/:id', deleteVote);

module.exports = router;
