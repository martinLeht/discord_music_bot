import { Message, MessageEmbed } from "discord.js";
const { TextChannel } = require('discord.js');
import { IQueue } from "../models/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { injectable } from "inversify";

@injectable()
export class InfoCommand extends AbstractCommand {
    public readonly name: Command = Command.info;

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (message.channel.type === 'GUILD_TEXT') {
            const textChannel: typeof TextChannel = message.channel;
            if (!this.isMemberInVoiceChannel(message)) {
                return textChannel.send(
                    "You have to be in a voice channel to stop the music!"
                );
            }
            const infoMsg: MessageEmbed = this.constructEmbedInfo();

            return textChannel.send({ embeds: [infoMsg] });
        } else {
            return;
        }
    }

    private constructEmbedInfo(): MessageEmbed {
        const infoMessage: MessageEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Dj Nippon by Nippon Squad')
            .setThumbnail('https://wallpaperaccess.com/full/2840971.jpg')
            .setDescription('A simple music player that can be used through chat with command prefix \"!\" before command (examples below).\n\n' 
                + 'Play music by song name or youtube URL and add them to queue. Control the playing music by skipping songs or stopping music completely.\n\n'
                + 'Commands:')
            .addFields(
                { 
                    name: 'Play music:', 
                    value: '!play <SONG NAME> OR <URL>\n'
                            + 'E.g.: **!play lotr playlist**\n'
                            + 'E.g.: **!play https://www.youtube.com/watch?v=CahOLfYxiq0**\n\n'
                            + '**Play options:**\n'
                            + '-spotifyPlaylist=<NAME> or <query by NAME and OWNER>\n'
                            + 'E.g.: !play **-spotifyPlaylist=lotr playlist**\n'
                            + 'E.g.: !play **-spotifyPlaylist=name:lotr playlist owner:Impact Records**',
                    inline: true 
                },
                { 
                    name: 'Skip song:', 
                    value: '!skip'
                            + '**Skip options:**\n'
                            + '-to <TRACK INDEX>\n'
                            + 'E.g.: !skip **-to 3**',
                    inline: true 
                },
                { 
                    name: 'Stop music:', 
                    value: '!stop', 
                    inline: true 
                },
                { 
                    name: 'Info:', 
                    value: '!info', 
                    inline: true 
                },
            );

        return infoMessage;
    }

    
}