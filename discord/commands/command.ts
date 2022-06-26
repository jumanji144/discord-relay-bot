import {CommandInteractionOptionResolver, CommandInteraction, Message} from 'discord.js';
import {SlashCommandBuilder} from '@discordjs/builders';

export interface Command {

    name: string;
    execute(message: Message, args: string[]): Promise<void>;

}

export interface Option {
    
    name: string;
    type: string;
    description?: string;
    required?: boolean;

}