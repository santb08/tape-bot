const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
    clientId: '28b24d6f63bb473bae3f6153af55dc0e',
    clientSecret: '771428e8e5b24a0cabdc0fadc979c760'
});

spotifyApi.setAccessToken('BQBvu_hkOIzrOU3LzvjFEqExrjsiUFOhpECBDFEd7UgmNCnbZ8eba2j0Id01D4b61SWzemYbPw5w3WcC7WjitQsTR5EujNnXJL1VQxrUznq0BZtHDzHgJJ1ahcDfCs8JFh9LOlHi8FHwMrZPEQ');

const getSongDetails = async url => {
    const data = await spotifyApi.search(url, ['track'])
    console.log(data.body);
    return song.tracks.items[0];
};

getSongDetails('https://open.spotify.com/track/03a359wbiUsjN9h6yzXvmS?si=1c254c68178c4027')

module.exports = {
    getSongDetails
}