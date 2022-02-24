import { Guild, Message } from "discord.js";
const { TextChannel } = require('discord.js');
import { IQueue } from "../models/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { injectable } from "inversify";

@injectable()
export class StopCommand extends AbstractCommand {

    public readonly name: Command = Command.stop;

    public async execute(message: Message, _args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (message.channel.type === 'GUILD_TEXT') {
            const textChannel: typeof TextChannel = message.channel;
            if (!this.isMemberInVoiceChannel(message)) {
                return textChannel.send(
                    "You have to be in a voice channel to stop the music!"
                );
            }

            if(!message.guild) return;

            const guild: Guild = message.guild;
            const serverQueue = queue.get(guild.id);
            if (!serverQueue){
                return textChannel.send("There is no song that I could stop!");
            }

            if (!serverQueue.connection) {
                this.leaveChannel(serverQueue, queue, guild.id);
                return textChannel.send("Something went wrong on song dispatching...");
            }

            serverQueue.songs = [];
            serverQueue.audioPlayer.stop();
        } else {
            return;
        }
    }

    private leaveChannel(serverQueue: IQueue, queue: Map<string, IQueue>, guildId: string) {
        serverQueue.connection.destroy();
        queue.delete(guildId);
    }
}