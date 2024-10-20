import { ChannelType, Guild, Message, EmbedBuilder, VoiceBasedChannel } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, DiscordGatewayAdapterCreator } from "@discordjs/voice";
const { TextChannel } = require('discord.js');
import { Command } from "../Command";
import { AbstractCommand } from "../AbstractCommand";
import { ISong } from "../../api/models/ISong";
import { IQueue } from "../models/IQueue";
import { Option } from '../Option';
import { IOption } from "../IOption";
import { inject, injectable } from "inversify";
import { YoutubeService } from "../../api/services/YoutubeService";
import { TYPES } from "../../config/types";
import { SpotifyService } from "../../api/services/SpotifyService";
import { IPlaylist } from "../../api/models/IPlaylist";
import { DiscordUtils } from "../../utils/DiscordUtils";
import { join } from "path";

@injectable()
export class PlayCommand extends AbstractCommand {

    public readonly name: Command = Command.play;

    public readonly options: Option[] = [
        Option.startAt,
        Option.playlist,
        Option.spotifyPlaylist,
        Option.spotifyAlbum
    ];

    private youtubeService: YoutubeService;
    private spotifyService: SpotifyService;

    private readonly joinAudioResourcePath: string = join(__dirname, '..', '..', 'resources', 'DJ_Khaled_2.mp3');

    constructor(
        @inject(TYPES.YoutubeService) youtubeService: YoutubeService,
        @inject(TYPES.SpotifyService) spotifyService: SpotifyService
    ) {
        super();
        this.youtubeService = youtubeService;
        this.spotifyService = spotifyService;
    }

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>) {
        if (message.channel.type === ChannelType.GuildText && !!message.member?.voice.channel && !!message.guild) {
            const voiceChannel = message.member?.voice.channel;
            const textChannel: typeof TextChannel = message.channel;
            /* Check permissions and args*/    
            if (!this.hasPermissions(message) && args.length < 1) {
                textChannel.send(
                    "Lacking permissions (connect and speak) or arguments, if you need me as a private DJ..."
                );
            } else {    
                const guild = message.guild;
                // Extract options from arguments
                const opts: IOption[] = this.getOptions(message, args);
                const songArgs = args.filter(arg => !this.isOptionArg(arg));
                
                console.log(`Got command: ${args.join(" ")}`);

                if (opts.length > 0) {
                    if (opts[0].name === Option.playlist || opts[0].name === Option.spotifyPlaylist) {
                        /* Fetch and play playlist */
                        const playlist = await this.fetchPlaylist(songArgs, opts);
                        if (!playlist || playlist.songs.length < 1) {
                            textChannel.send(`No playlist found with arguments:  **${args.join(" ")}**`); 
                        } else {
                            this.handlePlaylist(textChannel, guild, queue, voiceChannel, playlist);
                        }
                    } else if (opts[0].name === Option.spotifyAlbum) {
                        /* Fetch and play playlist */
                        const album = await this.fetchAlbum(songArgs);
                        if (!album || album.songs.length < 1) {
                            textChannel.send(`No album found with arguments:  **${args.join(" ")}**`); 
                        } else {
                            this.handlePlaylist(textChannel, guild, queue, voiceChannel, album);
                        }
                    }
                } else {
                    /* Fetch and play song */
                    const song: ISong | null = await this.fetchSong(songArgs);
                    if(!song || !song.url) {
                        textChannel.send(`No song found with arguments:  **${args.join(" ")}**`);
                    } else {
                        this.handleSong(textChannel, guild, queue, voiceChannel, song);
                    }
                }
            }
        }
    }

    private async fetchSong(songArgs: string[]): Promise<ISong | null> {
        if (songArgs[0].includes("www.youtube.com/watch?")) {
            return await this.youtubeService.getSongByUrl(songArgs[0]);
        } else {
            const searchKeywords = songArgs.join(" ");
            return await this.youtubeService.getSongBySearch(searchKeywords);
        }
    }

    private async fetchPlaylist(songArgs: string[], opts: IOption[]) {
        if (opts[0].name === Option.playlist) {
            //TODO: implement support to fetch youtube playlist
            return null;
        } else if (opts[0].name === Option.spotifyPlaylist) {
            const playlistData = await this.spotifyService.getPlaylistByArguments(songArgs);
            if (playlistData) {
                return await this.youtubeService.getSongsAsPlaylist(playlistData.songs, playlistData.name);
            }
        }

        return null;
    }

    private async fetchAlbum(songArgs: string[]) {
        const albumData = await this.spotifyService.getAlbumByArguments(songArgs);
        if (albumData) {
            return await this.youtubeService.getSongsAsPlaylist(albumData.songs, albumData.name);
        }
        return null;
    }

    private async handleSong(textChannel: any, guild: Guild, queue: Map<string, IQueue>, voiceChannel: VoiceBasedChannel, song: ISong): Promise<void> {
        const serverQueue = queue.get(guild.id);
        console.log(song);
        if (!serverQueue) {
            try {
                // Join the voicechat and save the connection
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator as DiscordGatewayAdapterCreator
                });
                const audioPlayer = createAudioPlayer()

                const queueContract: IQueue = {
                    textChannel: textChannel,
                    voiceChannel: voiceChannel,
                    connection: connection,
                    audioPlayer: audioPlayer,
                    songs: [],
                    volume: 5
                };
                
                // Pushing the song to songs array
                if (!song || !song.url || !song.title) {
                    textChannel.send('Could not add song...');
                    this.leaveChannel(queueContract, queue, guild.id);
                }
                queueContract.songs.push(song);
                queue.set(guild.id, queueContract);

                try {
                    queueContract.audioPlayer.play(createAudioResource(this.joinAudioResourcePath));
                    queueContract.connection.subscribe(audioPlayer);
                    await this.sleep(5000);
                    await this.play(guild, queueContract.songs[0], queue);
                } catch(err) {
                    console.error(err)
                }
            } catch (err: any) {
                // Printing the error message if the bot fails to join the voicechat
                console.log(err);
                queue.delete(guild.id);
                textChannel.send(err);
            }
        } else {
            if (!song || !song.url || !song.title) {
                serverQueue.textChannel.send('Could not add song...');
            } else {
                serverQueue.songs.push(song);
                textChannel.send(`Added to the queue: **${song.title}**`);
            }
        }
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async handlePlaylist(textChannel: any, guild: Guild, queue: Map<string, IQueue>, voiceChannel: VoiceBasedChannel, playlist: IPlaylist) {
        if (playlist.songs.length > 0) {
            const serverQueue = queue.get(guild.id);
            if (!serverQueue) {
                try {
                    // Join the voicechat and save the connection
                    const connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: guild.id,
                        adapterCreator: guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
                    });
                    const audioPlayer = createAudioPlayer()
                    const queueContract: IQueue = {
                        textChannel: textChannel,
                        voiceChannel: voiceChannel,
                        connection: connection,
                        audioPlayer: audioPlayer,
                        songs: [],
                        volume: 10
                    };

                    playlist.songs.filter(song => !!song.url).forEach(song => queueContract.songs.push(song));
                    if (queueContract.songs.length > 0) {
                        queue.set(guild.id, queueContract);

                        const playlistEmbedMsg: EmbedBuilder = DiscordUtils.constructEmbedPlaylist(playlist);
                        textChannel.send({embeds: [playlistEmbedMsg]});
                        
                        // Calling the play function to start a song
                        this.play(guild, queueContract.songs[0], queue);
                    }
                } catch (err: any) {
                    // Printing the error message if the bot fails to join the voicechat
                    console.log(err);
                    queue.delete(guild.id);
                    textChannel.send(err);
                }
            } else {
                serverQueue.songs = [];
                playlist.songs.filter(song => !!song.url).forEach(song => serverQueue.songs.push(song));

                if (serverQueue.songs.length > 0) {
                    const playlistEmbedMsg: EmbedBuilder = DiscordUtils.constructEmbedPlaylist(playlist);
                    textChannel.send({embeds: [playlistEmbedMsg]});
                    
                    // Calling the play function to start a song
                    this.songFinishHandler(guild, serverQueue, queue);
                } else {
                    this.leaveChannel(serverQueue, queue, guild.id);
                }
            }
        }
    }

    private async play(guild: Guild, song: ISong, queue: Map<string, IQueue>): Promise<void> {
        const serverQueue = queue.get(guild.id);

        if (!!serverQueue) {
            if (!song || !song.url) {
                serverQueue.textChannel.send(`No track or URL available to play`);
                this.leaveChannel(serverQueue, queue, guild.id);
            } else {
                try {
                    const audioStream = await this.youtubeService.getAudioStreamYtdlCore(song.url);
                    if (audioStream) {
                        const resource = createAudioResource(audioStream, { 
                            inputType: StreamType.WebmOpus,
                        });
                        if (resource) {
                            serverQueue.songs[0].playing = true;
                            serverQueue.audioPlayer.play(resource);
                            serverQueue.audioPlayer.on(AudioPlayerStatus.Playing, () => {
                                console.log('The audio player has started playing!');
                                console.log(serverQueue.songs.find(song => song.playing));
                            });
                            serverQueue.audioPlayer.on(AudioPlayerStatus.Idle, () => this.songFinishHandler(guild, serverQueue, queue));
                            serverQueue.audioPlayer.on('error', error => {
                                console.error("ERROR OCCURED on audio play");
                                console.error(error);
                                this.leaveChannel(serverQueue, queue, guild.id);
                            });
    
                            serverQueue.connection.subscribe(serverQueue.audioPlayer);
    
                            serverQueue.textChannel.send(`Start playing: **${song.title}**\n ${song.url}`);
                            console.log(resource)
                        } else {
                            serverQueue.textChannel.send(`Got no audio resource from YTDL API: **${song.title}**\n ${song.url}`);
                            this.leaveChannel(serverQueue, queue, guild.id);
                        }
                    } else {
                        serverQueue.textChannel.send(`Could not extract audio stream for: **${song.title}**`);
                        this.leaveChannel(serverQueue, queue, guild.id);
                    }
                } catch (err) {
                    console.log(err);
                    serverQueue.textChannel.send(`An error occured: \n${err}`);
                    this.leaveChannel(serverQueue, queue, guild.id);
                }
            }
        }
    }

    private async songFinishHandler(guild: Guild, serverQueue: IQueue, queue: Map<string, IQueue>): Promise<void> {
        const currentlyPlayingIndex = serverQueue.songs.findIndex(song => song.playing);
        if (currentlyPlayingIndex > -1) {
            serverQueue.songs.splice(currentlyPlayingIndex, 1);
        }
        if (serverQueue.songs.length > 0) {
            serverQueue.songs.forEach(song => song.playing = false);

            let nextTrackIndex = 0;
            if (currentlyPlayingIndex > 0 && serverQueue.songs.length > 1) {
                nextTrackIndex = currentlyPlayingIndex;
            }

            serverQueue.songs[nextTrackIndex].playing = true;
            const nextTrack: ISong = serverQueue.songs[nextTrackIndex];

            if (!nextTrack) {
                this.leaveChannel(serverQueue, queue, guild.id);
            } else {
                if (nextTrack.url) {
                    const audioStream = await this.youtubeService.getAudioStreamYtdlCore(nextTrack.url);
                    if (audioStream) {
                        const resource = createAudioResource(audioStream, { 
                            inputType: StreamType.WebmOpus
                        });
                        serverQueue.audioPlayer.play(resource);
                        
                        const playlistEmbedMsg: EmbedBuilder = DiscordUtils.constructEmbedPlaylist({ name: "Current Queue", songs: serverQueue.songs });
                        serverQueue.textChannel.send({embeds: [playlistEmbedMsg]});
                        serverQueue.textChannel.send(`Start playing: **${nextTrack.title}**\n ${nextTrack.url}`);
                    } else {
                        serverQueue.textChannel.send(`Could not extract audio stream for: **${nextTrack.title}**`);
                        this.songFinishHandler(guild, serverQueue, queue);
                    }
                } else {
                    serverQueue.textChannel.send(`No track URL available for: **${nextTrack.title}**`);
                    this.songFinishHandler(guild, serverQueue, queue);
                }
            }
        } else {
            this.leaveChannel(serverQueue, queue, guild.id);
        }        
    }
}