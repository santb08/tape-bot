// @packages
const ytsr = require('ytsr');
const { VoiceChannel } = require('discord.js');
const {
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
  VoiceConnectionDisconnectReason,
} = require('@discordjs/voice');
const { IS_SPOTIFY_URL } = require('./util/regexp');
const { mapSpotifyUrlToYtdl } = require('./util/spotify');
const Queue = require('./queue');
const { searchSong } = require('./util/genius');
const Song = require('./song');

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
  async addSong(guildId, userId, song) {
    // TODO: Check same voiceChannel in the actual queue
    const queue = this.getQueue(guildId);
    const playlistSongs = [];
    let possibleSong;

    if (IS_SPOTIFY_URL(song)) {
      const spotifyResponse = await mapSpotifyUrlToYtdl(song);
      if (Array.isArray(spotifyResponse)) {
        playlistSongs.push(...spotifyResponse);
      } else {
        possibleSong = spotifyResponse;
      }
    } else {
      const { items } = await ytsr(song, { limit: 1, type: 'video' });
      possibleSong = items[0];

      possibleSong = new Song(
        possibleSong.title,
        possibleSong.author.name,
        possibleSong.url,
      )
    }

    if (!possibleSong && !playlistSongs.length) {
      throw Error('Song not found');
    }

    if (!queue) {
      const newQueue = new Queue(guildId);
      this.serverQueues.set(guildId, newQueue);

      if (playlistSongs?.length)
        newQueue.addSong(...playlistSongs);

      if (possibleSong)
        newQueue.addSong(possibleSong);
    } else {
      queue.addSong(possibleSong);
    }

    return playlistSongs[0] ?? possibleSong;
  }

  /**
   * @param {String} guildId
   * @param {VoiceChannel} voiceChannel
   * @returns
   */
  async joinVoiceChannel(voiceChannel) {
    const queue = this.getQueue(voiceChannel.guild.id);
    const existingConnection = queue.isConnected;

    if (existingConnection) {
      if (existingConnection.channelId === voiceChannel.channelId) {
        if (!queue.isPlaying) {
          queue.processQueue();
        }
        return;
      } else if (queue.isPlaying) {
        throw Error('Cannot join voice channel while playing in another');
      }
    }

    const voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    queue.connectToVoiceChannel(voiceConnection);

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
                voiceConnection,
                VoiceConnectionStatus.Connecting,
                5_000,
              );
              // Probably moved voice channel
            } catch {
              voiceConnection.destroy();
              // Probably removed from voice channel
            }
          } else if (voiceConnection.rejoinAttempts < 5) {
            /*
              The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
            */
            // await wait((voiceConnection.rejoinAttempts + 1) * 5_000);
            voiceConnection.rejoin();
          } else {
            /*
              The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
            */
            voiceConnection.destroy();
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

      this.startPlaying(voiceChannel.guildId, queue.songs[0]);

      return voiceConnection;
    } catch (error) {
      voiceConnection.destroy();
      throw error;
    }
  }

  async getLyrics(guildId) {
    const queue = this.getQueue(guildId);

    if (!queue?.currentSong) {
      throw Error('There is no song playing.');
    }

    try {
      const lyrics = await searchSong(queue.currentSong);
      return lyrics;
    } catch (error) {
      throw 'Error';
    }
  }

  async startPlaying(guildId) {
    const serverQueue = this.getQueue(guildId);
    if (serverQueue.isPlaying) {
      return;
    }
    serverQueue.initializeAudioPlayer();
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
}

module.exports = Bot;
