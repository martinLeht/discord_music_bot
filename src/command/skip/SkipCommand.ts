import { Guild, Message, MessageEmbed } from "discord.js";
const { TextChannel } = require('discord.js');
import { IQueue } from "../models/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { Option } from '../Option';
import { inject, injectable } from "inversify";
import { IOption } from "../IOption";
import { TYPES } from "../../config/types";
import { YoutubeService } from "../../api/services/YoutubeService";
import { createAudioResource } from "@discordjs/voice";
import { ISong } from "../../api/models/ISong";
import { DiscordUtils } from "../../utils/DiscordUtils";

@injectable()
export class SkipCommand extends AbstractCommand {

    public readonly name: Command = Command.skip;

    public readonly options: Option[] = [
        Option.to
    ];

    private youtubeService: YoutubeService;

    constructor(
        @inject(TYPES.YoutubeService) youtubeService: YoutubeService
    ) {
        super();
        this.youtubeService = youtubeService;
    }

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (message.channel.type === 'GUILD_TEXT') {
            const textChannel: typeof TextChannel = message.channel;
            if (!this.isMemberInVoiceChannel(message)) {
                return textChannel.send(
                    "You have to be in a voice channel to skip a song!"
                );
            }
            
            if(!message.guild) return;

            const guild: Guild = message.guild;
            const serverQueue = queue.get(guild.id);

            if (!serverQueue) {
                return textChannel.send("There is no song that I could skip!");
            }

            if (!serverQueue.connection) {
                this.leaveChannel(serverQueue, queue, guild.id);
                return textChannel.send("Something went wrong on song dispatching...");
            }

            // Extract options from arguments
            const opts: IOption[] = this.getOptions(message, args);
            const providedArgs = args.filter(arg => !this.isOptionArg(arg));

            if (serverQueue.songs.length > 1) {
                if (opts.length > 0) {
                    if (opts[0].name === Option.to && providedArgs) {
                        const trackIndex = Number(providedArgs);
                        if (!isNaN(trackIndex)) {
                            if (trackIndex > 0) this.handleSkipToSong(trackIndex - 1, guild, serverQueue, queue);
                            else this.handleSkipToSong(trackIndex, guild, serverQueue, queue);
                        } else {
                            return textChannel.send("Invalid argument, provide the index of the track in the queue.\n"
                                                    + "E.g.: **!skip -to 1**");
                        }
                    }
                } else {
                    serverQueue.audioPlayer.stop();
                }
            } else {
                serverQueue.audioPlayer.stop();
            }
        } else {
            return;
        }
    }

    private leaveChannel(serverQueue: IQueue, queue: Map<string, IQueue>, guildId: string) {
        serverQueue.connection.destroy();
        queue.delete(guildId);
    }

    private async handleSkipToSong(trackIndex: number, guild: Guild, serverQueue: IQueue, queue: Map<string, IQueue>) {
        const nextTrack: ISong = serverQueue.songs[trackIndex];
        
        if (nextTrack) {
            const currentlyPlayingIndex = serverQueue.songs.findIndex(song => song.playing);
            serverQueue.songs.forEach(song => song.playing = false);
            serverQueue.songs[trackIndex].playing = true;
            if (currentlyPlayingIndex > -1) {
                serverQueue.songs.splice(currentlyPlayingIndex, 1);
            }
    
            if (!nextTrack) {
                this.leaveChannel(serverQueue, queue, guild.id);
                return;
            } else {
                if (nextTrack.url) {
                    const audioStream = await this.youtubeService.getAudioStream(nextTrack.url);
                    if (audioStream) {
                        const resource = createAudioResource(audioStream.stream, { inputType: audioStream.type });
                        serverQueue.audioPlayer.play(resource);
                        
                        const playlistEmbedMsg: MessageEmbed = DiscordUtils.constructEmbedPlaylist({ name: "Current Queue", songs: serverQueue.songs });
                        serverQueue.textChannel.send({embeds: [playlistEmbedMsg]});
                        serverQueue.textChannel.send(`Start playing: **${nextTrack.title}**\n ${nextTrack.url}`);
                    } else {
                        serverQueue.textChannel.send(`Could not extract audio stream for: **${nextTrack.title}**`);
                    }
                } else {
                    serverQueue.textChannel.send(`No track URL available for: **${nextTrack.title}**`);
                }
            }
        } else {
            serverQueue.textChannel.send(`No track available in provided index: **${trackIndex}**`);
        }
        
    }
        
}