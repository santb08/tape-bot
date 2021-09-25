const IS_YOUTUBE_URL = (str) =>
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=\w+$/.test(str) ||
  /^https?:\/\/(www\.)?youtu\.be\/\w+$/.test(str);

const IS_SPOTIFY_URL = (str) =>
  /^https?:\/\/(www\.)?open\.spotify\.com\//.test(str);

module.exports = {
  IS_SPOTIFY_URL,
  IS_YOUTUBE_URL,
};
