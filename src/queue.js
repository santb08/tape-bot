// @packages
const {
  AudioPlayerStatus,
  AudioPlayer,
  createAudioResource,
  VoiceConnectionStatus
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const LOOP_QUEUE = 'LOOP_QUEUE';

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

  get isConnected() {
    return this.voiceConnection?.state.status === VoiceConnectionStatus.Ready;
  }

  get isPlaying() {
    return this.audioPlayer?.state.status === AudioPlayerStatus.Playing;
  }

  get currentSong() {
    return this.songsList[this._currentSong];
  }

  addSong(...songs) {
    console.log('adding', songs)
    this.songsList.push(...songs);
  }

  clear() {
    this.songsList = [];
    this._currentSong = -1;
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
    this._currentSong = 0;
    const firstSong = this.songs[this._currentSong];
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
    console.log('Next song');
    let newCurrentSongIndex = this._currentSong + 1;

    if (this.loop === LOOP_QUEUE) {
      this._currentSong = this._currentSong % this.songsList.length;
    }

    const newSong = this.songsList[newCurrentSongIndex]

    if (!newSong) {
      newCurrentSongIndex--;
    }

    this._currentSong = newCurrentSongIndex;

    return newSong;
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

    if (!newSong) {
      return this.audioPlayer.stop();
    }

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
