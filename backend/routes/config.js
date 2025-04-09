const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 3000}` });
});

module.exports = router;
