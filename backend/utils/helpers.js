function formatName(name) {
    return name.trim().split(' ')
        .slice(0, 2)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
        .join(' ');
}

module.exports = { formatName };
