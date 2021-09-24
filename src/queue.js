// @packages
const {
  AudioPlayerStatus,
  AudioPlayer,
  createAudioResource,
  StreamType
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');

class Queue {
  constructor(guildId) {
    this.songsList = [];
    this.audioPlayer = null;
    this.guildId = guildId;
    this.queueLock = false;
    this.voiceConnection = null;
    this._currentSong = 0;
  }

  get songs() {
    return this.songsList;
  }

  get isPlaying() {
    return this.audioPlayer?.state.status === AudioPlayerStatus.Playing;
  }

  get currentSong() {
    return this.songsList[this._currentSong];
  }

  addSong(song) {
    this.songsList.push(song);
  }

  connectToVoiceChannel(voiceConnection) {
    this.voiceConnection = voiceConnection;
  }

  getSong(index) {
    return this.songsList[index];
  }

  initializeAudioPlayer() {
    const audioPlayer = new AudioPlayer();
    audioPlayer.on('stateChange', (oldState, newState) => {
      if (
        newState.status === AudioPlayerStatus.Idle &&
        oldState.status !== AudioPlayerStatus.Idle
      ) {
        this.processQueue();
      }
    });

    audioPlayer.on('error', (error) => {
      console.error(error);
    });

    this.voiceConnection.subscribe(audioPlayer);
    const firstSong = this.popSong();
    this.audioPlayer = audioPlayer;
    this.playSong(firstSong.url);
  }

  playSong(songUrl) {
    if (this.audioPlayer?.state.status !== AudioPlayerStatus.Idle) {
      throw Error('An error occurred with audioPlayer');
    }

    const song = ytdl(songUrl, { filter: 'audioonly', quality: 'lowestaudio' });
    const songStream = createAudioResource(song);
    this.audioPlayer.play(songStream);
  }

  popSong() {
    this._currentSong = (this._currentSong + 1) % this.songsList.length;
    return this.songsList[this._currentSong];
  }

  processQueue() {
    if (
      this.queueLock ||
      !this.songsList.length ||
      this.audioPlayer?.state.status !== AudioPlayerStatus.Idle
    ) {
      return;
    }

    const newSong = this.popSong();

    try {
      this.playSong(newSong.url);
      this.queueLock = false;
    } catch (error) {
      this.queueLock = false;
    }
  }

  skipSong() {
    this.audioPlayer.stop();
    this.queueLock = false;
  }
}

module.exports = Queue;
