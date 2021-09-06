const { IS_SPOTIFY_URL } = require("../util/regexp");

test('Check if some URLs are from Spotify', () => {
    const spotifyURLs = [
        'https://open.spotify.com/track/03a359wbiUsjN9h6yzXvmS?si=05ecae5130e942bf',
        'https://open.spotify.com/track/7bidsoy3nzCDNYzAzrV7NN?si=99e6109840254780'
    ];

    const nonSpotifyURLs = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=99e6109840254780'
    ];

    expect(spotifyURLs.every(IS_SPOTIFY_URL)).toBe(true);
    expect(nonSpotifyURLs.every(IS_SPOTIFY_URL)).toBe(false);
});
