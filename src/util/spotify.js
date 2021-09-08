// @packages
const ytsr = require('ytsr');
const { getPreview } = require('spotify-url-info');

const mapSpotifyUrlToYtdl = async (spotifyUrl) => {
  const data = await getPreview(spotifyUrl);
  const { title, artist } = data;
  const { items } = await ytsr(`${artist}-${title}`, {
    limit: 1,
    type: 'video',
  });
  const [possibleSong] = items;
  return possibleSong;
};

module.exports = {
  mapSpotifyUrlToYtdl,
};
