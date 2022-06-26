import {Command} from './command';
import {map} from '../client';
import {SlashCommandBuilder} from '@discordjs/builders';

const command: Command = {
    name: 'link',
    execute: async (message, args) => {
        const twitchChannel = args[0];
        const discordChannel = args[1].replace('<#', '').replace('>', '');

        // verify that discord channel exists
        const discordChannelObj = message.client.channels.cache.find(c => c.id === discordChannel);
        if (!discordChannelObj) {
            message.reply({
                embeds: [{
                    title: 'Error',
                    description: `Discord channel ${discordChannel} not found`,
                    color: 0xFF0000
                }]
            }).then(msg => {
                setTimeout(() => {
                    msg.delete();
                }, 5000);
            });
        }

        map(twitchChannel, discordChannel);

        // silently reply to the command
        message.reply({
            embeds: [{
                title: 'Linked',
                description: `Linked ${twitchChannel} to ${discordChannel}`,
                color: 0x00ff00
            }],
        }).then(msg => {
            setTimeout(() => {
                msg.delete();
            }, 5000);
        });
    }
}

export default command;