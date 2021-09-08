// @packages
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const { VoiceChannel } = require('discord.js');
const {
  AudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} = require('@discordjs/voice');
const SpotifyWebApi = require('spotify-web-api-node');
const { IS_SPOTIFY_URL } = require('./util/regexp');

// @constants
const defaultQueue = {
  songs: [],
  voiceChannel: null,
  audioPlayer: null,
};

class Bot {
  constructor() {
    this.serverQueues = new Map();
  }

  init(client) {
    if (!client) {
      throw new Error('Client is required');
    }

    this.client = client;
  }

  getQueue(guildId) {
    return this.serverQueues.get(guildId);
  }

  getSongsQueue(guildId) {
    const queue = this.serverQueues.get(guildId);
    if (!queue) {
      throw Error('Queue not found');
    }
    const queueString = queue.songs
      .map((song) => `**${song.title}**`)
      .join('\n');
    return `The queue is:\n${queueString}`;
  }

  /**
   * @param {Object} voiceChannel
   * @param {String} guildId
   * @param {String} userId
   * @param {String} song
   */
  async addSong(guildId, userId, songName) {
    // TODO: Check same voiceChannel in the actual queue
    const queue = this.getQueue(guildId);

    const ytSearchQuery = songName;

    if (IS_SPOTIFY_URL(ytSearchQuery)) {
      const songName = SpotifyWebApi.getSongDetails(songName);
    }

    const { items } = await ytsr(songName, { limit: 1, type: 'video' });
    const [possibleSong] = items;

    // TODO: Handle possible match args
    if (!possibleSong) {
      throw Error('Song not found');
    }

    const song = {
      title: possibleSong.title,
      url: possibleSong.url,
    };

    if (!queue) {
      const newQueue = this.serverQueues
        .set(guildId, {
          ...defaultQueue,
          songs: [],
        })
        .get(guildId);

      newQueue.songs.push({
        ...song,
        userId,
      });
    } else {
      queue.songs.push({
        userId,
        ...song,
      });
    }

    return song;
  }

  /**
   * @param {String} guildId
   * @param {VoiceChannel} voiceChannel
   * @returns
   */
  async joinVoiceChannel(voiceChannel) {
    const queue = this.getQueue(voiceChannel.guild.id);
    const voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    queue.connection = voiceConnection;
    this.serverQueues.set(voiceChannel.guild.id, queue);

    try {
      entersState(voiceConnection, VoiceConnectionStatus.Ready, 20e3);
    } catch (error) {
      throw error;
    }

    try {
      voiceConnection.on('stateChange', async (_, newState) => {
        if (newState.status === VoiceConnectionStatus.Disconnected) {
          if (
            newState.reason ===
              VoiceConnectionDisconnectReason.WebSocketClose &&
            newState.closeCode === 4014
          ) {
            /*
                            If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
                            but there is a chance the connection will recover itself if the reason of the disconnect was due to
                            switching voice channels. This is also the same code for the bot being kicked from the voice channel,
                            so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
                            the voice connection.
                        */
            try {
              await entersState(
                this.voiceConnection,
                VoiceConnectionStatus.Connecting,
                5_000,
              );
              // Probably moved voice channel
            } catch {
              this.voiceConnection.destroy();
              // Probably removed from voice channel
            }
          } else if (this.voiceConnection.rejoinAttempts < 5) {
            /*
                            The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
                        */
            await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
            this.voiceConnection.rejoin();
          } else {
            /*
                            The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
                        */
            this.voiceConnection.destroy();
          }
        } else if (newState.status === VoiceConnectionStatus.Destroyed) {
          this.stop(voiceChannel.guildId);
        }
        try {
          if (newState.status === VoiceConnectionStatus.Ready) {
            console.log('Bot connected');
          }
          // await entersState(
          //     voiceConnection,
          //     VoiceConnectionStatus.Ready,
          //     5_000
          // );
        } catch (error) {
          console.error('error', error);
          voiceConnection.destroy();
        }
      });

      this.play(voiceChannel.guildId, queue.songs[0]);

      // await entersState(
      //     voiceConnection,
      //     VoiceConnectionStatus.Ready,
      //     5_000
      // );
      // voiceConnection.on('error', console.warn);
      return voiceConnection;
    } catch (error) {
      voiceConnection.destroy();
      throw error;
    }
  }

  async play(guildId, song) {
    const serverQueue = this.getQueue(guildId);

    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guildId);
      throw Error("There's nothing else to play");
    }

    let audioPlayer;
    if (serverQueue.audioPlayer) {
        if (serverQueue.audioPlayer.state.status === AudioPlayerStatus.Playing) {
            return;
        }

        audioPlayer = serverQueue.audioPlayer;
    } else {
        audioPlayer = new AudioPlayer();
        serverQueue.connection.subscribe(audioPlayer);
    }


    const playSong = (songUrl) => {
      console.log('searching', songUrl);
      const stream = ytdl(songUrl, { filter: 'audioonly' });
      const songResource = createAudioResource(stream);
      audioPlayer.play(songResource);
    };

    playSong(song.url);

    this.updateQueue(guildId, { audioPlayer });

    audioPlayer.on('stateChange', (oldState, newState) => {
      if (
        newState.status === AudioPlayerStatus.Idle &&
        oldState.status === AudioPlayerStatus.Playing
      ) {
        const newSongs = serverQueue.songs.slice(1);
        console.log('New songs', newSongs);
        this.updateQueue(guildId, { songs: newSongs });
        if (newSongs.length) {
          playSong(newSongs[0].url);
        }
      } else if (newState.status === AudioPlayerStatus.Playing) {
        console.log(newState.resource);
      }
    });

    audioPlayer.on('error', (error) => {
      console.error(error);
    });

    // .on('finish', () => {
    //     console.log('a');
    //     serverQueue.songs.shift();
    //     play(guildId, serverQueue.songs[0]);
    // })
    // .on('error', error => console.error(error));
    // dispatcher.setVolumeLogarithmic(1);
    // serverQueue.textChannel.send(`Start playing: **${song.title}**`);
  }

  stop(guildId) {
    const queue = this.getQueue(guildId);
    if (!queue) return;
    if (queue.audioPlayer?.state.status === AudioPlayerStatus.Idle) return;
  }

  removeFromQueue(user, song) {
    this.serverQueues.delete(song);
  }

  skipSong(guildId) {
    const serverQueue = this.getQueue(guildId);
    const { audioPlayer } = serverQueue;

    if (!audioPlayer?.state.status === AudioPlayerStatus.Playing) {
      throw Error("There's nothing to skip");
    }

    audioPlayer.stop();
  }

  updateQueue(guildId, props = {}) {
    const queue = this.serverQueues.get(guildId);
    this.serverQueues.set(guildId, {
      ...queue,
      ...props,
    });
  }
}

module.exports = Bot;
