import { Guild, Message, EmbedBuilder, ChannelType } from "discord.js";
const { TextChannel } = require('discord.js');
import { IQueue } from "../models/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { injectable } from "inversify";
import { DiscordUtils } from "../../utils/DiscordUtils";

@injectable()
export class QueueCommand extends AbstractCommand {

    public readonly name: Command = Command.queue;

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (message.channel.type === ChannelType.GuildText) {
            const textChannel: typeof TextChannel = message.channel;
            if (!this.isMemberInVoiceChannel(message)) {
                return textChannel.send(
                    "You have to be in a voice channel to view the queue!"
                );
            }
            
            if(!message.guild) return;

            const guild: Guild = message.guild;
            const serverQueue = queue.get(guild.id);

            if (!serverQueue) {
                return textChannel.send("There are no tracks in the queue!");
            }

            if (!serverQueue.connection) {
                this.leaveChannel(serverQueue, queue, guild.id);
                return textChannel.send("Something went wrong on server queue connection...");
            }

            if (serverQueue.songs.length > 0) {
                const playlistEmbedMsg: EmbedBuilder = DiscordUtils.constructEmbedPlaylist({ name: "Current Queue", songs: serverQueue.songs });
                return textChannel.send({embeds: [playlistEmbedMsg]});
            } else {
                return textChannel.send("No tracks in queue.");
            }
            
        } else {
            return;
        }
    }

    private leaveChannel(serverQueue: IQueue, queue: Map<string, IQueue>, guildId: string) {
        serverQueue.connection.destroy();
        queue.delete(guildId);
    }
        
}