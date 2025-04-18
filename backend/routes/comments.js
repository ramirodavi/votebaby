const express = require('express');
const { getComments, addComment, deleteComment } = require('../controllers/comments');

const router = express.Router();

router.get('/', getComments);
router.post('/', addComment);
router.delete('/:id', deleteComment);

module.exports = router;
