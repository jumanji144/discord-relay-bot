const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_EMOJIS_AND_STICKERS'] }); // we need to cache emotes
const config = require('./config.json');

/**
 * get a channel by id
 * @param {string} channel the channel id 
 * @returns {Promise<Discord.TextChannel>} the channel
 */
async function getChannel(channel) {
    return new Promise((resolve, reject) => {
        var chan = client.channels.cache.find(c => c.id === channel)
        if (chan) {
            resolve(chan)
        }
        else {
            reject(new Error('Channel not found'))
        }
    });
}

/**
 * Returns a guild syncrhonously
 * @param {string} guild guild id
 * @returns {Discord.Guild} the guild
 */
function getGuild(guild) {
    return client.guilds.cache.find(g => g.id === guild);
}

/**
 * Creates an emoji in the emoji guild
 * @param {BufferResolvable | Base64Resolvable} resolvable the source
 * @param {string} name the name of the emoji
 * @returns {Promise<Discord.Emoji>} the emoji
 */
async function createEmoji(resolvable, name) {
    return new Promise((resolve, reject) => {
        var guild = getGuild(config.emojiGuild)
        guild.emojis.create(resolvable, name).then(emoji => {
            resolve(emoji);
        }).catch(err => {
            reject(err)
        });
    });
}

/**
 * Gets or creates an emoji
 * @param {string} name the name of the emoji
 * @param {BufferResolvable | Base64Resolvable} resolvable the source of the emoji 
 * @returns {Promise<Discord.Emoji>} the emoji
 */
async function getEmoji(name, resolvable) {
    return new Promise((resolve, reject) => {
        var guild = getGuild(config.emojiGuild)
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

/**
 * Sends a message into the configured channel
 * @param {string | MessagePayload | MessageOptions} message the message to send
 */
async function sendMessage(message) {
    // lookup the channel
    let channelObj = await getChannel(config.channel);
    if (channelObj) {
        // send the message
        channelObj.send(message);
    }
}

client.login(config.token); // login via token

module.exports = {
    createEmoji,
    sendMessage,
    getEmoji,
    getChannel,
    getGuild
}