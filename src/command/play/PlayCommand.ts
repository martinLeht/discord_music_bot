import { Guild, Message, MessageEmbed, VoiceChannel } from "discord.js";
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

@injectable()
export class PlayCommand extends AbstractCommand {

    public readonly name: Command = Command.play;

    public readonly options: Option[] = [
        Option.startAt,
        Option.playlist,
        Option.spotifyPlaylist
    ];

    private youtubeService: YoutubeService;
    private spotifyService: SpotifyService;

    constructor(
        @inject(TYPES.YoutubeService) youtubeService: YoutubeService,
        @inject(TYPES.SpotifyService) spotifyService: SpotifyService
    ) {
        super();
        this.youtubeService = youtubeService;
        this.spotifyService = spotifyService;
    }

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        
        const voiceChannel = message.member?.voice.channel;

        /* Check permissions */
        if (!voiceChannel) return message.channel.send("You need to be in a voice channel to play music!");

        if (!this.hasPermissions(message, voiceChannel)) {
            return message.channel.send(
                "I need the permissions to join and speak in your voice channel! These are the terms if you need me as a private DJ..."
            );
        }

        if (!args) return message.channel.send("You need provide arguments (url or video title) to play!");

        // Extract options from arguments
        const opts: IOption[] = this.getOptions(message, args);
        const songArgs = args.filter(arg => !this.isOptionArg(arg));
        
        console.log(`Got command: ${args.join(" ")}`);

        if (opts.length > 0) {
            if (opts[0].name === Option.playlist || opts[0].name === Option.spotifyPlaylist) {
                /* Fetch and play playlist */
                const playlist = await this.fetchPlaylist(songArgs, opts);
                if (!playlist || playlist.songs.length < 1) {
                    return message.channel.send(`No playlist found with arguments:  **${args.join(" ")}**`); 
                }
                return this.handlePlaylist(message, queue, voiceChannel, playlist);
            }
        } else {
            /* Fetch and play song */
            const song: ISong | null = await this.fetchSong(songArgs);
            if(!song) return message.channel.send(`No song found with arguments:  **${args.join(" ")}**`);

            return this.handleSong(message, queue, voiceChannel, song);
        }
    }

    private async fetchSong(songArgs: string[]): Promise<ISong | null> {
        let song: ISong | null = null;

        if (songArgs[0].includes("www.youtube.com/watch?")) {
            song = await this.youtubeService.getSongByUrl(songArgs[0]);
        } else {
            const searchKeywords = songArgs.join(" ");
            song = await this.youtubeService.getSongBySearch(searchKeywords);
        }
        return song;
    }

    private async fetchPlaylist(songArgs: string[], opts: IOption[]) {
        let playlist = null;

        
        switch(opts[0].name) {
            case Option.playlist:

                break;
            case Option.spotifyPlaylist:
                let playlistData;
                const queryArgs = songArgs.filter(arg => arg.includes("name:") || arg.includes("owner:"));
                if (queryArgs.length > 0) {
                    const nameQueryParamIndex = songArgs.findIndex(arg => arg.includes("name:"));
                    const ownerQueryParamIndex = songArgs.findIndex(arg => arg.includes("owner:"));
                    const nameArgs = songArgs.slice(nameQueryParamIndex, ownerQueryParamIndex);
                    const ownerArgs = songArgs.slice(ownerQueryParamIndex);

                    let name = nameArgs.join(" ");
                    name = name.substr(name.indexOf(":") + 1);

                    let owner = ownerArgs.join(" ");
                    console.log(owner);
                    owner = owner.substr(owner.indexOf(":") + 1);

                    console.log(`Search parameters: \nNAME = ${name} \nOWNER = ${owner}`);
                    if (!name) return;

                    playlistData = await this.spotifyService.getPlaylist(name, owner);
                } else {
                    const searchKeywords = songArgs.join(" ");
                    playlistData = await this.spotifyService.getPlaylist(searchKeywords);
                }
                
                if (playlistData) {
                    const songs: ISong[] = await Promise.all(playlistData.songs.map(async songData => {
                        const searchKeywords = `${songData.title} ${songData.artists?.join(" ")}`;
                        console.log(`Searchterms for playlist: ${searchKeywords}`)
                        const song = await this.youtubeService.getSongBySearch(searchKeywords);
                        if (song) songData.url = song.url;
                        await this.delay(300);
                        return songData;
                    }));
                    playlist = {
                        name: playlistData.name,
                        songs: songs
                    }
                }
                break;
        }
        console.log(playlist);
        return playlist;
    }

    private delay(timeMs: number, value?: any) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve(value);
            }, timeMs);
        });
    }

    private async handleSong(message: Message, queue: Map<string, IQueue>, voiceChannel: VoiceChannel, song: ISong) {
        if (!message.guild) return message.channel.send("No quild available to handle the queue.");

        const guild = message.guild;

        const serverQueue = queue.get(guild.id);
        if (!serverQueue) {
            try {
                // Join the voicechat and save the connection
                const connection = await voiceChannel.join();
                const queueContract: IQueue = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: connection,
                    songs: [],
                    volume: 5,
                    playing: true,
                };

                // Pushing the song to songs array
                if (!song) return;
                queueContract.songs.push(song);
                queue.set(guild.id, queueContract);


                // Calling the play function to start a song
                await this.play(guild, queueContract.songs[0], queue);
            } catch (err: any) {
                // Printing the error message if the bot fails to join the voicechat
                console.log(err);
                queue.delete(guild.id);
                return message.channel.send(err);
            }
        } else {
            serverQueue.songs.push(song);
            return message.channel.send(`Added to the queue: **${song.title}**`);
        }
    }

    private async handlePlaylist(message: Message, queue: Map<string, IQueue>, voiceChannel: VoiceChannel, playlist: IPlaylist) {
        if (!message.guild) return message.channel.send("No quild available to handle the queue.");

        const guild = message.guild;

        const serverQueue = queue.get(guild.id);
        if (!serverQueue) {
            try {
                // Join the voicechat and save the connection
                const connection = await voiceChannel.join();
                const queueContract: IQueue = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: connection,
                    songs: [],
                    volume: 5,
                    playing: true,
                };

                // Pushing the song to songs array
                if (playlist.songs.length < 1) return;
                playlist.songs.forEach(song => queueContract.songs.push(song));
                queue.set(guild.id, queueContract);

                const playlistEmbedMsg: MessageEmbed = this.constructEmbedPlaylist(playlist);
                message.channel.send({embed: playlistEmbedMsg});
                
                // Calling the play function to start a song
                await this.play(guild, queueContract.songs[0], queue);
            } catch (err: any) {
                // Printing the error message if the bot fails to join the voicechat
                console.log(err);
                queue.delete(guild.id);
                return message.channel.send(err);
            }
        }
    }

    private constructEmbedPlaylist(playlist: IPlaylist): MessageEmbed {

        const playlistContent = playlist.songs.map((song, i) => {
            return `${i + 1}. **${song.title}**`
        })

        const playlistMessage: MessageEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setAuthor(`Playlist: ${playlist.name}`)
            .setThumbnail('https://wallpaperaccess.com/full/2840971.jpg')
            .setDescription(playlistContent.join('\r\n'));

        return playlistMessage;
    }

    /*
    private handlePlayOpts(opts: IOption[]): any {
        let playOpts = {};
        for (const opt of opts) {
            switch(opt.name) {
                case Option.startAt:
                    playOpts.begin = opt.value + 's';
                    break;

                default: 
                    break; 
            }
        }
        return playOpts;
    }
*/
    private async play(guild: Guild, song: ISong, queue: Map<string, IQueue>): Promise<void> {
        const serverQueue = queue.get(guild.id);

        if (!serverQueue) return;

        if (!serverQueue.connection || !song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }

        if (song.url) {
            let audioStream = await this.youtubeService.getAudioStream(song.url);
            const dispatcher = serverQueue.connection.play(audioStream, {
                type: "opus"
            })
            .on('finish', async () => this.songFinishHandler(guild, serverQueue, queue))
            .on('error', (error: Error) => {
                console.error(error);
                serverQueue.voiceChannel.leave();
                queue.delete(guild.id);
                return;
            });
    
            dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
            serverQueue.textChannel.send(`Start playing: **${song.title}**\n ${song.url}`);
        } else {
            serverQueue.textChannel.send(`No track URL available for: **${song.title}`);
        }
    }

    private async songFinishHandler(guild: Guild, serverQueue: IQueue, queue: Map<string, IQueue>): Promise<void> {
        serverQueue.songs.shift();
        await this.play(guild, serverQueue.songs[0], queue);
    }
}