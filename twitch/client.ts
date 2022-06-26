import tmi from 'tmi.js'
import config from './config.json'
import * as discordClient from '../discord/client'
import TwitchApi from 'node-twitch'
import { Emote, Badge } from 'node-twitch/dist/types/objects'
import { Emoji } from 'discord.js'

interface TwitchEmote extends Emote {
	user: boolean
}

interface TwitchBadge {
	set_id: string
	version: {
		[key: string]: {
			id: string,
			image_url_1x?: string,
			image_url_2x?: string,
			image_url_4x?: string
		}
	}
	user: boolean
}

// global objects
var badges: {[key: string]: {[key: string]: TwitchBadge}} = {}
var emotes: {[key: string]: string} = {}

const twitch = new TwitchApi({
	client_id: config.clientID,
	client_secret: config.clientSecret,
})

const client = new tmi.Client({
	options: { debug: true },
	connection: {
		reconnect: true,
		secure: true
	},
	channels: Object.keys(discordClient.getChannels())
})

client.on('message', onMessageHandler)
client.on('connected', async (address, port) => {
	console.log(`Connected to ${address}:${port}`)
});

async function cacheEmotesAndBadges(target: string) {
	const userID = await (await twitch.getUsers(target)).data[0].id
	const userBadges = await twitch.getChannelBadges(userID)
	const globalBadges = await twitch.getGlobalBadges()

	const finalBadges: {[key: string]: TwitchBadge} = {}

	// load badges into new data format
	for (const badge of globalBadges.data) {
		const newBadge: TwitchBadge = {
			set_id: badge.set_id,
			version: {},
			user: false
		}
		for (const version of badge.versions) {
			newBadge.version[version.id] = version
		}

		// badges are better indexed by set_id and versions are better indexed by id, instead of [{}]

		finalBadges[badge.set_id] = newBadge
	}

	for (const badge of userBadges.data) {
		const newBadge: TwitchBadge = {
			set_id: badge.set_id,
			version: {},
			user: true
		}
		for (const version of badge.versions) {
			newBadge.version[version.id] = version
		}
		finalBadges[badge.set_id] = newBadge
	}

	badges[target] = finalBadges
}

/**
 * Returns the prefix for user object or 'twitch' if not found
 * @param {{user?: boolean}} object twitch object with `user` attribute
 * @returns {string} the prefix
 */
function getPrefix(channel: string, object: TwitchBadge | TwitchEmote) {
	if(object.user){
		return channel
	} else {
		return 'twitch'
	}
}

async function getBadgeEmote(channel: string, badge: TwitchBadge, version: string): Promise<Emoji | undefined> {
	// will get the badge emote for the given version
	const badgeEmote = badge.version[version]
	if(!badgeEmote) {
		return new Promise((resolve, reject) => resolve(undefined))
	}
	return await discordClient.getEmoji(getPrefix(channel, badge)
		+ badge.set_id.replace('-', '_') // '-' is not allowed in discord names
		+ version,
		badgeEmote.image_url_2x||'') // 4x is the best resolution
}

function cut(str: string, cutStart: number, cutEnd: number) {
	return str.substr(0, cutStart) + str.substr(cutEnd + 1);
}

function emojiToString(emoji: Emoji): string {
	return (emoji.animated ? "a" : "") + "<:" + emoji.name + ":" + emoji.id + ">"
}

function fetchEmote(id: string): string {

	return 'https://static-cdn.jtvnw.net/emoticons/v2/' + id + '/2.0'

}

async function formatEmotes(text: string, emotes: any): Promise<string> {
	var splitText = text.split('');
	for(var i in emotes) {
		var e = emotes[i];
		for(var j in e) {
			var mote = e[j];
			if(typeof mote == 'string') {
				mote = mote.split('-');
				mote = [parseInt(mote[0]), parseInt(mote[1])];
				var length =  mote[1] - mote[0],
					empty = Array.apply(null, new Array(length + 1)).map(function() { return '' });
				splitText = splitText.slice(0, mote[0]).concat(empty).concat(splitText.slice(mote[1] + 1, splitText.length));
				splitText.splice(mote[0],
					 1,
					emojiToString(
						await discordClient.getEmoji(
							('e' + i).substring(0, 32),
						'http://static-cdn.jtvnw.net/emoticons/v1/' + i + '/2.0')));
			}
		}
	}
	return splitText.join('');
}

async function onMessageHandler(target: string, context: tmi.Userstate, msg: string, self: boolean) {

	target = target.substring(1) // remove the '#' from the target

	var channelBadges = badges[target]

	if(!channelBadges){
		await cacheEmotesAndBadges(target)
		channelBadges = badges[target]
		if(!channelBadges){
			console.error("Could not get badges for channel " + target)
			return
		}
	}

	var name = ""
	if(context.badges) {
		// get the badges as emotes
		const badgeEmotes = []
		for (const badge of Object.keys(context.badges)) {
			const badgeData = channelBadges[badge]
			badgeEmotes.push(await getBadgeEmote(target, badgeData, context.badges[badge] as string))
		}

		for (const emote of badgeEmotes) {
			if(!emote) continue
			name += emojiToString(emote)
		}
	}

	name += context.username

	const message = context.emotes ? await formatEmotes(msg, context.emotes) : msg

	const color = parseInt((context.color??'#FFFFFF').replace('#', ''), 16) // get the color as number
	let embeds = [{
		color: color,
		title: name,
		description: message, // get the emoji replaced message
	}]
	discordClient.sendMessage(discordClient.getChannels()[target], { embeds: embeds }) // send off to discord
}

export async function reconnect() {
	await client.disconnect()
	await client.connect()
}
client.connect()
