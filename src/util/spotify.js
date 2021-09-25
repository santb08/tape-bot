// @packages
const ytsr = require('ytsr');
const { getTracks, getPreview } = require('spotify-url-info');

const IS_TRACK = (str) => /\/track\//.test(str);
const IS_PLAYLIST = (str) => /\/playlist\//.test(str);

const mapSpotifyUrlToYtdl = async (spotifyUrl) => {
  if (IS_TRACK(spotifyUrl)) {
    console.log('song');
    const data = await getPreview(spotifyUrl);
    const { title, artist } = data;
    const { items } = await ytsr(`${artist} ${title}`, {
      limit: 1,
      type: 'video',
    });
    const [possibleSong] = items;

    return possibleSong;
  }
  if (IS_PLAYLIST(spotifyUrl)) {
    console.log('playlist');
    const data = await getTracks(spotifyUrl);
    const songsYtdl = await Promise.all(data?.map(async (song) => {
      const { name, artists } = song;
      const { items } = await ytsr(`${artists[0]?.name} ${name}`, {
        limit: 1,
        type: 'video',
      });
      const [possibleSong] = items;
      return possibleSong;
    }));
    console.log('xd', songsYtdl);
    return songsYtdl;
  }
};


module.exports = {
  mapSpotifyUrlToYtdl,
};
