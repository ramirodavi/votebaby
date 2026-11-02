const express = require('express');
const { getSetting } = require('../settings');

const router = express.Router();

function forwardedFirst(value) {
    if (!value) return '';
    return String(value).split(',')[0].trim();
}

/** URL pública da API vista pelo navegador (Host / X-Forwarded-* do pedido). */
function publicApiUrl(req) {
    const proto = forwardedFirst(req.get('x-forwarded-proto')) || req.protocol;
    const host = forwardedFirst(req.get('x-forwarded-host')) || req.get('host');
    if (!host) {
        return `http://localhost:${process.env.PORT || 3000}`;
    }
    return `${proto}://${host}`;
}

// Rota para fornecer as configurações do backend ao frontend
router.get('/', (req, res) => {
    res.json({
        apiUrl: publicApiUrl(req),
        babyBoyName: getSetting('BABY_BOY_NAME'),
        babyGirlName: getSetting('BABY_GIRL_NAME'),
        revealResult: getSetting('REVEAL_RESULT'),
        revealText: getSetting('REVEAL_TEXT'),
        boyColor: getSetting('BOY_COLOR'),
        bgBoyColor: getSetting('BG_BOY_COLOR'),
        girlColor: getSetting('GIRL_COLOR'),
        bgGirlColor: getSetting('BG_GIRL_COLOR'),
        balloonBoyColor: getSetting('BALLOON_BOY_COLOR'),
        balloonGirlColor: getSetting('BALLOON_GIRL_COLOR'),
        revealBgBoyColor: getSetting('REVEAL_BG_BOY_COLOR'),
        revealBgGirlColor: getSetting('REVEAL_BG_GIRL_COLOR'),
        allowCommentsAfterReveal: getSetting('ALLOW_COMMENTS_AFTER_REVEAL') === 'true'
    });
});

module.exports = router;
