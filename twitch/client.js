const tmi = require('tmi.js')
const config = require('./config.json')
const discordClient = require('../discord/client')
const TwitchAPI = require('node-twitch').default
const Discord = require('discord.js')

// global objects
var badges = {}
var emotesById = {}
var emotes = {}

const twitch = new TwitchAPI({
	client_id: config.clientID,
	client_secret: config.clientSecret,
})

const client = new tmi.Client({
	options: { debug: true },
	connection: {
		reconnect: true,
		secure: true
	},
	channels: [config.channel]
})

client.on('message', onMessageHandler)
client.on('connected', async (address, port) => {
	console.log(`Connected to ${address}:${port}`)
	cacheEmotesAndBadges()
});

async function cacheEmotesAndBadges() {
	const userID = await (await twitch.getUsers(config.channel)).data[0].id
	const userBadges = await twitch.getChannelBadges(userID)
	const globalBadges = await twitch.getGlobalBadges()

	// load badges into new data format
	for (const badge of globalBadges.data) {
		const newBadge = {
			set_id: badge.set_id,
			version: {}
		}
		for (const version of badge.versions) {
			newBadge.version[version.id] = version
		}

		// badges are better indexed by set_id and versions are better indexed by id, instead of [{}]

		badges[badge.set_id] = newBadge
	}

	for (const badge of userBadges.data) {
		const newBadge = {
			set_id: badge.set_id,
			version: {}
		}
		for (const version of badge.versions) {
			newBadge.version[version.id] = version
		}
		newBadge.user = true // mark as user created
		badges[badge.set_id] = newBadge
	}

	const userEmotes = await twitch.getChannelEmotes(userID)
	const globalEmotes = await twitch.getGlobalEmotes()

	// emotes have 2 lists for faster lookup

	for (const emote of globalEmotes.data) {
		emotes[emote.name] = emote
		emotesById[emote.id] = emote
	}

	for (const emote of userEmotes.data) {
		const newEmote = emote
		newEmote.user = true // mark as user created
		emotes[emote.name] = newEmote
		emotesById[emote.id] = newEmote
	}
}

/**
 * Returns the prefix for user object or 'twitch' if not found
 * @param {{user?: boolean}} object twitch object with `user` attribute
 * @returns {string} the prefix
 */
function getPrefix(object) {
	if(object.user){
		return config.channel
	} else {
		return 'twitch'
	}
}

/**
 * Get the discord emoji for a given twitch badge
 * @param {string} badge the badge name 
 * @param {string} version the version of the badge
 * @returns {Discord.Emoji} the discord emoji
 */
async function getBadgeEmote(badge, version) {
	// will get the badge emote for the given version
	const badgeObject = badges[badge]
	const badgeEmote = badgeObject.version[version]
	return await discordClient.getEmoji(getPrefix(badgeObject)
		+ badge.replace('-', '_') // '-' is not allowed in discord names
		+ version,
		badgeEmote.image_url_4x) // 4x is the best resolution
}

/**
 * Get the discord emoji for a given twitch emote
 * @param {{
 * 		    name: string
 *          images: {
 *				url_1x:string,
 *				url_2x:string,
 *				url_4x:string
 *  		},
 *			scale: ["1.0", "2.0", "3.0"]
 *		  }} emote 
 * @returns {Discord.Emoji} the discord emoji
 */
async function getEmote(emote) {

	// figure out best possible resolution
	var url = emote.images.url_1x
	if (emote.scale.includes("2.0")) {
		url = emote.images.url_2x
	}
	if (emote.scale.includes("3.0")) {
		url = emote.images.url_4x
	}

	return await discordClient.getEmoji(getPrefix(emote)
		+ emote.name.replace('-', '_'), // '-' is not allowed in discord names
		url)
}

/**
 * Cut a part of a string from a given index
 * @param {string} str target string
 * @param {number} cutStart begin
 * @param {number} cutEnd end
 * @returns {string} the cut string
 */
function cut(str, cutStart, cutEnd) {
	return str.substr(0, cutStart) + str.substr(cutEnd + 1);
}

/**
 * Convert an emoji to string representation
 * @param {Discord.Emoji} emoji 
 * @returns {string} string representation of emoji
 */
function emojiToString(emoji) {
	return (emoji.animated ? "a" : "") + "<:" + emoji.name + ":" + emoji.id + ">"
}

/**
 * Convert twitch emote list + ranges to discord emote list
 * @param {{[key: string]: string[]}} emoteList a list of emote id -> ranges
 * @param {string} message the message to replace emotes in
 * @returns {string} new message with emotes replaced
 */
async function replaceEmotes(emoteList, message) {
	var finalMessage = message
	for (const id of Object.keys(emoteList)) {
		const emote = emotesById[id]
		const toReplace = emote.name
		const replacement = emojiToString(await getEmote(emote))
		finalMessage = finalMessage.replaceAll(toReplace, replacement)
	}
	return finalMessage
}

/**
 * Handle the twitch message event
 * @param {string} target the channel target
 * @param {tmi.Userstate} context the userstate of the message
 * @param {string} msg the message
 * @param {boolean} self if it was sent by the bot (doesn't apply here)
 */
async function onMessageHandler(target, context, msg, self) {

	// get the badges as emotes
	const badgeEmotes = []
	for (const badge of Object.keys(context.badges)) {
		badgeEmotes.push(await getBadgeEmote(badge, context.badges[badge]))
	}

	var name = ""
	for (const emote of badgeEmotes) {
		name += emojiToString(emote)
	}
	name += context.username

	const message = context.emotes ? await replaceEmotes(context.emotes, msg) : msg

	const color = parseInt(context.color.replace('#', ''), 16) // get the color as number
	let embeds = [{
		color: color,
		title: name,
		description: message, // get the emoji replaced message
	}]
	discordClient.sendMessage({ embeds: embeds }) // send off to discord
}

client.connect()
