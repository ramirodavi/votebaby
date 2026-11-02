const express = require('express');
const voteRoutes = require('./votes');
const commentRoutes = require('./comments');
const configRoutes = require('./config');
const adminRoutes = require('./admin');

const router = express.Router();

router.use('/votes', voteRoutes);
router.use('/comments', commentRoutes);
router.use('/config', configRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
