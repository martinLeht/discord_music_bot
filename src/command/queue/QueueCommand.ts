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

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>) {
        if (message.channel.type === ChannelType.GuildText && !!message.guild) {
            const textChannel: typeof TextChannel = message.channel;
            if (!this.isMemberInVoiceChannel(message)) {
                textChannel.send(
                    "You have to be in a voice channel to view the queue!"
                );
            } else {
                const guild: Guild = message.guild;
                const serverQueue = queue.get(guild.id);
                
                if (!!serverQueue) {
                    if (!serverQueue.connection) {
                        this.leaveChannel(serverQueue, queue, guild.id);
                        textChannel.send("Something went wrong on server queue connection...");
                    } else {
                        if (serverQueue.songs.length > 0) {
                            const playlistEmbedMsg: EmbedBuilder = DiscordUtils.constructEmbedPlaylist({ name: "Current Queue", songs: serverQueue.songs });
                            textChannel.send({embeds: [playlistEmbedMsg]});
                        } else {
                            textChannel.send("No tracks in queue.");
                        }
                    }
                }
            }
        }
    }
        
}