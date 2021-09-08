// @packages
const { AudioPlayerStatus, AudioPlayer, createAudioResource } = require("@discordjs/voice");
const ytdl = require("ytdl-core");

class Queue {
    constructor(guildId) {
        this._songs = [];
        this.audioPlayer = null;
        this.guildId = guildId;
        this.queueLock = false;
        this.voiceConnection = null;
        this.voiceConnection = null;
    }

    get songs() {
        return this._songs;
    }

    get isPlaying() {
        return this.audioPlayer?.state.status === AudioPlayerStatus.Playing;
    }

    addSong(song) {
        this._songs.push(song);
    }

    connectToVoiceChannel(voiceConnection) {
        this.voiceConnection = voiceConnection;
    }

    getSong(index) {
        return this._songs[index];
    }

    initializeAudioPlayer() {
        const audioPlayer = new AudioPlayer();
        audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle &&
                oldState.status !== AudioPlayerStatus.Idle
            ) {
                this.processQueue();
            } else if (newState.status === AudioPlayerStatus.Playing) {
                console.log(newState.resource);
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
        if (this.audioPlayer?.state.status !== AudioPlayerStatus.Idle ) {
            throw Error('An error occurred with audioPlayer');
        }

        const song = ytdl(songUrl, { filter: 'audioonly' });
        const songStream = createAudioResource(song);
        this.audioPlayer.play(songStream);
    }

    popSong() {
        return this._songs.shift();
    }

    processQueue() {
        if (this.queueLock || !this._songs.length || this.audioPlayer?.state.status !== AudioPlayerStatus.Idle) {
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