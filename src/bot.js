// @packages
const ytsr  = require('ytsr');
const { joinVoiceChannel, entersState, VoiceConnectionStatus, AudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { VoiceChannel } = require('discord.js');

// @constants
const defaultQueue = {
    songs: [],
    voiceChannel: null,
    audioPlayer: null
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
    async addSong(guildId, userId, songName) {
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
                ...song
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
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });
        queue.connection = voiceConnection;
        this.serverQueues.set(voiceChannel.guild.id, queue);
        
        try {
            entersState(
                voiceConnection,
                VoiceConnectionStatus.Ready,
                20e3
            );
        } catch (error) {
            throw error;
        }

        try {
            voiceConnection.on('stateChange', async (oldState, newState) => {
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
                    // voiceConnection.destroy();-
                    }
            })

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
          throw Error('There\'s nothing else to play');
        }
        
        if (serverQueue.audioPlayer?.state.status === AudioPlayerStatus.Playing && serverQueue.songs.length) {
            return;
        }

        const audioPlayer = new AudioPlayer();
        serverQueue.connection.subscribe(audioPlayer);
        
        const playSong = (songUrl) => {
            console.log('searching', songUrl)
            const stream = ytdl(songUrl, { filter: 'audioonly' });
            const songResource = createAudioResource(stream);
            audioPlayer.play(songResource);
        };

        playSong(song.url);

        this.updateQueue(
            guildId,
            { audioPlayer }
        );

        audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && 
                oldState.status === AudioPlayerStatus.Playing) {
                    const newSongs = serverQueue.songs.slice(1); 
                    console.log('New songs', newSongs);
                    this.updateQueue(guildId, { songs: newSongs });
                    if (newSongs.length) {
                        console.log('xd', newSongs[0]);
                        playSong(newSongs[0].url);
                    }
            }
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

    removeFromQueue(user, song) {
        this.serverQueues.delete(song);
    }

    updateQueue(guildId, props = {}) {
        const queue = this.serverQueues.get(guildId);
        this.serverQueues.set(
            guildId,
            {
                ...queue,
                ...props
            }
        )
    }
}

module.exports = Bot;