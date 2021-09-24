const { getLyrics } = require('genius-lyrics-api');

const options = {
    apiKey: '4lHUBBx6CnSeIUfb3SEyolGsoh4doUrhIfzBrE3N5lT8xll29tvIC_uvmEWmu4yC'
}

const searchSong = async ({ title, author }) => {
    console.log(`searching for lyrics of: ${title} by ${author}`);
    return await getLyrics({
        title,
        artist: ' ',
        optimizeQuery: true,
        ...options
    });
};

module.exports = {
    searchSong
};