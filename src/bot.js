// @packages
const ytsr  = require('ytsr');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const createDiscordJSAdapter = require('./adapters');
const ytdl = require('ytdl-core');

// @constants
const defaultQueue = {
    songs: [],
    voiceChannel: null
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

    /**
     * @param {Object} voiceChannel
     * @param {String} guildId
     * @param {String} userId
     * @param {String} song
     */
    async addSong(voiceChannel, guildId, userId, songName) {
        // TODO: Check same voiceChannel in the actual queue
        const queue = this.getQueue(guildId);
        const { items } = await ytsr(songName, { limit: 1 });
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
            const newQueue = this.serverQueues.set(
                guildId,
                {
                    ...defaultQueue,
                    songs: []
                }
            ).get(guildId);

            newQueue.songs.push({
                ...song,
                userId
            });
        } else {
            queue.songs.push({
                userId,
                song: song
            });
        }

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: createDiscordJSAdapter(voiceChannel),
        });

        console.log('trying');

        try {
            console.log('ola');
            queue.connection = await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
            // this.play(guildId, queue.songs[0]);
            return song;
        } catch (error) {
            connection.destroy();
            throw error;
        }

    }

    play(guildId, song) {
        const serverQueue = queue.get(guildId);
        console.log('playing');
        if (!song) {
          serverQueue.voiceChannel.leave();
          queue.delete(guildId);
          return;
        }

        console.log('ola');
        const dispatcher = serverQueue.connection
          .play(ytdl(song.url))
          .on('finish', () => {
              console.log('a');
            serverQueue.songs.shift();
            play(guildId, serverQueue.songs[0]);
          })
          .on('error', error => console.error(error));
        dispatcher.setVolumeLogarithmic(1);
        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    }

    removeFromQueue(user, song) {
        this.serverQueues.delete(song);
    }
}

module.exports = Bot;