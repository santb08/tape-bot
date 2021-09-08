require('dotenv').config()
// @packages
const { Client, Intents } = require('discord.js');
const Bot = require('./bot');
const { settings } = require('./config');

// @constants
const bot = new Bot();
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

client.once('ready', () => {
  bot.init(client);
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(settings.prefix)) return;
  const voiceChannel = message.member.voice.channel;

  if (!voiceChannel) {
    return message.reply('You need to join a voice channel first!');
  }

  const permissions = voiceChannel.permissionsFor(message.client.user);

  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.reply(
      'I need the permissions to join and speak in your voice channel!',
    );
  }

  const args = message.content
    .slice(settings.prefix.length)
    .trim()
    .split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === 'play' || command === 'p') {
    try {
      const argSongName = args.join(' ');

      if (message.author.id === '341345652145520640') {
        return message.channel.send(`Oigan al otro`, { tts: true });
      }

      if (!argSongName) {
        return message.reply('You need to provide a song name!');
      }

      const song = await bot.addSong(message.guildId, null, argSongName);
      bot.joinVoiceChannel(voiceChannel);

      message.reply(`Added **${song.title}** to the queue!`);
    } catch (error) {
      message.reply(error.message);
    }
  }

  if (command === 'skip' || command === 's') {
    try {
      bot.skipSong(message.guildId);
    } catch (error) {
      message.reply(error.message);
    }
  }

  if (command == 'queue' || command == 'q') {
    try {
      message.reply(bot.getSongsQueue(message.guildId));
    } catch (error) {
      message.reply(error.message);
    }
  }
});

// const cleanUpServer = (eventType) => {
//     console.log(eventType, 'Logging out...');
//     client.destroy();
// };1

// [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
//     process.on(eventType, cleanUpServer.bind(null, eventType));
// });

console.log(process.env.DISCORD_TOKEN);
client.login(process.env.DISCORD_TOKEN);
