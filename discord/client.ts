import Discord, { AnyChannel, Emoji, Guild, MessageOptions, MessagePayload, TextChannel } from 'discord.js';
import fs from 'fs';
import {SlashCommandBuilder} from '@discordjs/builders'
import { Command } from './commands/command';
import { reconnect } from '../twitch/client';

interface Config {
    token: string;
    channels: { [key: string]: string };
    emojiGuild: string; 
}

// import config from './config.json';
const config: Config = require('./config.json');

const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_EMOJIS_AND_STICKERS'] }); // we need to cache emotes
var commands: Command[] = []

client.on('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    // register slash commands
    const relativePath = __dirname + '/commands';
    const commandFiles = fs.readdirSync(relativePath).filter(file => file !== 'command.js' && file !== 'command.ts' && !file.endsWith('d.ts'));

    for (const file of commandFiles) {
        const command: Command = require(`./commands/${file}`).default;
        commands.push(command);
    }

})

client.on('message', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('[')) return;
    for(const command of commands) {
        if (message.content.startsWith(`[${command.name}`)) {
            const args = message.content.split(' ');
            args.shift();
            command.execute(message, args);
        }
    }
})

export function getChannel(channel: string): TextChannel {
    return client.channels.cache.find(c => c.id === channel) as TextChannel;
}

export function getGuild(guild: string): Guild | undefined { // syncronous
    return client.guilds.cache.find(g => g.id === guild);
}

export async function createEmoji(resolvable: string, name: string): Promise<Emoji> {
    return new Promise((resolve, reject) => {
        var guild = getGuild(config.emojiGuild)
        if(!guild) {
            reject(new Error('Guild not found'))
            return;
        }
        guild.emojis.create(resolvable, name).then(emoji => {
            resolve(emoji);
        }).catch(err => {
            reject(err)
        });
    });
}

export async function getEmoji(name: string, resolvable: string): Promise<Emoji> {
    return new Promise((resolve, reject) => {
        var guild = getGuild(config.emojiGuild)
        if(!guild) {
            reject(new Error('Guild not found'))
            return;
        }
        var emoji = guild.emojis.cache.find(e => e.name === name)
        if(!emoji) {
            console.log(`Emoji ${name} was not cached, creating...`)
            createEmoji(resolvable, name).then(emoji => {
                resolve(emoji)
            }).catch(err => {
                reject(err)
            })
        }else
        resolve(emoji)
    });
}

export async function sendMessage(channel: string, message: string | MessagePayload | MessageOptions) {
    // lookup the channel
    let channelObj = await getChannel(channel);
    if (channelObj) {
        // send the message
        channelObj.send(message);
    }
}

export function map(twitchChannel: string, discordChannel: string) {
    config.channels[twitchChannel] = discordChannel;
    // save the config
    fs.writeFileSync(__dirname + '/config.json', JSON.stringify(config, null, 2));
    reconnect()
}

export function getChannels() {
    return config.channels;
}

client.login(config.token); // login via token

// define on shutdown
process.on('SIGINT', () => {
    console.log('SIGINT received. Exiting...');
    client.destroy();
    process.exit(0);
})