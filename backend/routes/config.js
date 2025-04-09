const express = require('express');
const router = express.Router();

// Rota para fornecer as configurações do backend ao frontend
router.get('/', (req, res) => {
    res.json({
        apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`,
        babyBoyName: process.env.BABY_BOY_NAME || 'Menino',
        babyGirlName: process.env.BABY_GIRL_NAME || 'Menina',
        revealResult: process.env.REVEAL_RESULT || 'pending',
        revealText: process.env.REVEAL_TEXT || '',
        boyColor: process.env.BOY_COLOR || 'rgb(58, 177, 98)',
        bgBoyColor: process.env.BG_BOY_COLOR || 'rgb(172, 241, 197)',
        girlColor: process.env.GIRL_COLOR || 'rgb(219, 130, 207)',
        bgGirlColor: process.env.BG_GIRL_COLOR || 'rgb(231, 179, 223)',
        balloonBoyColor: process.env.BALLOON_BOY_COLOR || 'rgb(58, 177, 98)',
        balloonGirlColor: process.env.BALLOON_GIRL_COLOR || 'rgb(219, 130, 207)',
        revealBgBoyColor: process.env.REVEAL_BG_BOY_COLOR || 'rgb(172, 241, 197)',
        revealBgGirlColor: process.env.REVEAL_BG_GIRL_COLOR || 'rgb(231, 179, 223)'
    });
});

module.exports = router;
