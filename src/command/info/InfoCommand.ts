import { Message, EmbedBuilder, ChannelType } from "discord.js";
const { TextChannel } = require('discord.js');
import { IQueue } from "../models/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { injectable } from "inversify";

@injectable()
export class InfoCommand extends AbstractCommand {
    public readonly name: Command = Command.info;

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (message.channel.type === ChannelType.GuildText) {
            const textChannel: typeof TextChannel = message.channel;
            if (!this.isMemberInVoiceChannel(message)) {
                return textChannel.send(
                    "You have to be in a voice channel to stop the music!"
                );
            }
            const infoMsg: EmbedBuilder = this.constructEmbedInfo();

            return textChannel.send({ embeds: [infoMsg] });
        } else {
            return;
        }
    }

    private constructEmbedInfo(): EmbedBuilder {
        const infoMessage: EmbedBuilder = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Dj Nippon by Nippon Squad')
            .setThumbnail('https://wallpaperaccess.com/full/2840971.jpg')
            .setDescription('A simple music player that can be used through chat with command prefix \"!\" before command (examples below).\n\n' 
                + 'Play music by song name or youtube URL and add them to queue. Control the playing music by skipping songs or stopping music completely.\n\n'
                + 'Commands:\n\n'
                + '--------- PLAY ---------\n'
                + '**Play music: ** !play <SONG NAME> OR <URL>\n'
                + ' - E.g.: **!play lotr playlist**\n'
                + ' - E.g.: **!play https://www.youtube.com/watch?v=CahOLfYxiq0**\n\n'
                + '**Play options:**\n'
                + '-spotifyPlaylist <NAME> or <query by NAME and OWNER> or <query by ID>\n'
                + '-spotifyAlbum <NAME> or <query by NAME and OWNER> or <query by ID>\n'
                + ' - E.g.: !play **-spotifyPlaylist lotr playlist**\n'
                + ' - E.g.: !play **-spotifyPlaylist name:lotr playlist owner:Impact Records**\n'
                + ' - E.g.: !play **-spotifyPlaylist id:3VUBoaNL92phq6qkFfz9bX**\n'
                + ' - E.g.: !play **-spotifyAlbum saint fetuan**\n'
                + ' - E.g.: !play **-spotifyAlbum name:saint fetuan owner:fetti**\n'
                + ' - E.g.: !play **-spotifyAlbum id:66tJmYOp7o0DQHUdjTJp8r**\n\n'
                + '--------- SKIP ---------\n'
                + '**Skip tracks: ** !skip\n\n'
                + '**Skip options:**\n'
                + '-to <TRACK INDEX>\n'
                + ' - E.g.: !skip **-to 3**\n\n'
                + '--------- STOP ---------\n'
                + '**Stop player: ** !stop\n\n'
                + '--------- INFO ---------\n'
                + '**Command Info: ** !info\n');

        return infoMessage;
    }

    
}