import { ChannelType, Guild, Message } from "discord.js";
const { TextChannel } = require('discord.js');
import { IQueue } from "../models/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { injectable } from "inversify";
import { getVoiceConnection } from "@discordjs/voice";

@injectable()
export class StopCommand extends AbstractCommand {

    public readonly name: Command = Command.stop;

    public async execute(message: Message, _args: string[], queue: Map<string, IQueue>) {
        if (message.channel.type === ChannelType.GuildText && !!message.guild) {
            const textChannel: typeof TextChannel = message.channel;
            if (!this.isMemberInVoiceChannel(message)) {
                textChannel.send(
                    "You have to be in a voice channel to stop the music!"
                );
            }

            const guild: Guild = message.guild;
            const serverQueue = queue.get(guild.id);
            if (!serverQueue) {
                const conn = getVoiceConnection(message.guild.id);
                if (conn) conn.destroy();
                textChannel.send("There is no song that I could stop!");
            } else {
                serverQueue.songs = [];
                serverQueue.audioPlayer.stop();
                this.leaveChannel(serverQueue, queue, guild.id);
            }
        }
    }
}