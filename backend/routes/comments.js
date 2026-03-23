const express = require('express');
const { getComments, addComment, deleteComment, updateComment } = require('../controllers/comments');

const router = express.Router();

router.get('/', getComments);
router.post('/', addComment);
router.patch('/:id', updateComment);
router.delete('/:id', deleteComment);

module.exports = router;
