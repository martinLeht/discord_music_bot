import { Message, MessageEmbed, MessageOptions } from "discord.js";
import { IQueue } from "../../song/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";

export class InfoCommand extends AbstractCommand {
    public readonly name: Command = Command.info;

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (!this.isMemberInVoiceChannel(message)) {
            return message.channel.send(
                "You have to be in a voice channel to stop the music!"
            );
        }
        const infoMsg: MessageEmbed = this.constructEmbedInfo();

        return message.channel.send({ embed: infoMsg });
    }

    private constructEmbedInfo(): MessageEmbed {
        const infoMessage: MessageEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setAuthor('Dj Nippon by Nippon Squad', 'https://wallpaperaccess.com/full/2840971.jpg', 'https://steamcommunity.com/groups/nipponsquad')
            .setThumbnail('https://wallpaperaccess.com/full/2840971.jpg')
            .setDescription('A simple music player that can be used through chat with command prefix \"!\" before command (examples below).\n\n' 
                + 'Play music by song name or youtube URL and add them to queue. Control the playing music by skipping songs or stopping music completely.\n\n'
                + 'Commands:')
            .addFields(
                { 
                    name: 'Play music:', 
                    value: '!play <song name> OR <url>\n'
                            + '**Options:**\n'
                            + '-startAt=< number in seconds >\n'
                            + 'E.g.: **-startAt=25**', 
                    inline: true 
                },
                { 
                    name: 'Skip song:', 
                    value: '!skip', 
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