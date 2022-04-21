import { Client, Guild, Message, MessageEmbed, VoiceChannel } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayer, VoiceConnection, AudioResource, AudioPlayerStatus, demuxProbe } from "@discordjs/voice";
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

@injectable()
export class PlayCommand extends AbstractCommand {

    public readonly name: Command = Command.play;

    public readonly options: Option[] = [
        Option.startAt,
        Option.playlist,
        Option.spotifyPlaylist,
        Option.spotifyAlbum
    ];

    private client: Client;
    private youtubeService: YoutubeService;
    private spotifyService: SpotifyService;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.YoutubeService) youtubeService: YoutubeService,
        @inject(TYPES.SpotifyService) spotifyService: SpotifyService
    ) {
        super();
        this.client = client;
        this.youtubeService = youtubeService;
        this.spotifyService = spotifyService;
    }

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (message.channel.type === 'GUILD_TEXT') {
            const voiceChannel: VoiceChannel = message.member?.voice.channel as VoiceChannel;
            const textChannel: typeof TextChannel = message.channel;
            /* Check permissions */
            if (!voiceChannel) return textChannel.send("You need to be in a voice channel to play music!");
    
            if (!this.hasPermissions(message, voiceChannel)) {
                return textChannel.send(
                    "I need the permissions to join and speak in your voice channel! These are the terms if you need me as a private DJ..."
                );
            }

            if (!message.guild) return textChannel.send("No quild available to handle the queue.");
            
            if (!args) return textChannel.send("You need provide arguments (url or video title) to play!");
    
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
                        return textChannel.send(`No playlist found with arguments:  **${args.join(" ")}**`); 
                    }

                    return this.handlePlaylist(textChannel, guild, queue, voiceChannel, playlist);
                } else if (opts[0].name === Option.spotifyAlbum) {
                    /* Fetch and play playlist */
                    const album = await this.fetchAlbum(songArgs, opts);
                    if (!album || album.songs.length < 1) {
                        return textChannel.send(`No album found with arguments:  **${args.join(" ")}**`); 
                    }

                    return this.handlePlaylist(textChannel, guild, queue, voiceChannel, album);
                }
            } else {
                /* Fetch and play song */
                const song: ISong | null = await this.fetchSong(songArgs);
                if(!song) return textChannel.send(`No song found with arguments:  **${args.join(" ")}**`);
    
                return this.handleSong(textChannel, guild, queue, voiceChannel, song);
            }
        } else {
            return;
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
                const queryArgs = songArgs.filter(arg => arg.includes("name:") || arg.includes("owner:") || arg.includes("id:"));
                if (queryArgs.length > 0) {
                    if (queryArgs.length === 1) {
                        const idQueryParamIndex = songArgs.findIndex(arg => arg.includes("id:"));
                        const idArg = songArgs.slice(idQueryParamIndex);
    
                        let id = idArg.join(" ");
                        id = id.substr(id.indexOf(":") + 1);
    
                        console.log(`Search parameters: \nID = ${id}`);
                        if (!id) return null;
    
                        playlistData = await this.spotifyService.getPlaylistById(id);
                    } else if (queryArgs.length === 2) {
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
                        if (!name) return null;
    
                        playlistData = await this.spotifyService.getPlaylist(name, owner);
                    }
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
                        await this.delay(500);
                        return songData;
                    }));
                    playlist = {
                        name: playlistData.name,
                        songs: songs
                    }
                }
                break;
        }
        return playlist;
    }

    private async fetchAlbum(songArgs: string[], opts: IOption[]) {
        let album = null;

        let albumData;
        const queryArgs = songArgs.filter(arg => arg.includes("name:") || arg.includes("owner:") || arg.includes("id:"));
        if (queryArgs.length > 0) {
            if (queryArgs.length === 1) {
                const idQueryParamIndex = songArgs.findIndex(arg => arg.includes("id:"));
                const idArg = songArgs.slice(idQueryParamIndex);

                let id = idArg.join(" ");
                id = id.substr(id.indexOf(":") + 1);

                console.log(`Search parameters: \nID = ${id}`);
                if (!id) return null;

                albumData = await this.spotifyService.getAlbumById(id);
            } else if (queryArgs.length === 2) {
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
                if (!name) return null;

                albumData = await this.spotifyService.getAlbum(name, owner);
            }
        } else {
            const searchKeywords = songArgs.join(" ");
            albumData = await this.spotifyService.getAlbum(searchKeywords);
        }
        
        if (albumData) {
            const songs: ISong[] = await Promise.all(albumData.songs.map(async songData => {
                const searchKeywords = `${songData.title} ${songData.artists?.join(" ")}`;
                console.log(`Searchterms for playlist: ${searchKeywords}`)
                const song = await this.youtubeService.getSongBySearch(searchKeywords);
                if (song) songData.url = song.url;
                await this.delay(300);
                return songData;
            }));
            album = {
                name: albumData.name,
                songs: songs
            }
        }
        console.log(album);
        return album;
    }

    private delay(timeMs: number, value?: any) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve(value);
            }, timeMs);
        });
    }

    private async handleSong(textChannel: any, guild: Guild, queue: Map<string, IQueue>, voiceChannel: VoiceChannel, song: ISong) {
        const serverQueue = queue.get(guild.id);
        if (!serverQueue) {
            try {
                // Join the voicechat and save the connection
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator
                });
                const audioPlayer = createAudioPlayer()
                const queueContract: IQueue = {
                    textChannel: textChannel,
                    voiceChannel: voiceChannel,
                    connection: connection,
                    audioPlayer: audioPlayer,
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
                return textChannel.send(err);
            }
        } else {
            serverQueue.songs.push(song);
            return textChannel.send(`Added to the queue: **${song.title}**`);
        }
    }

    private async handlePlaylist(textChannel: any, guild: Guild, queue: Map<string, IQueue>, voiceChannel: VoiceChannel, playlist: IPlaylist) {

        if (playlist.songs.length < 1) return;

        const serverQueue = queue.get(guild.id);
        if (!serverQueue) {
            try {
                // Join the voicechat and save the connection
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });
                const audioPlayer = createAudioPlayer()
                const queueContract: IQueue = {
                    textChannel: textChannel,
                    voiceChannel: voiceChannel,
                    connection: connection,
                    audioPlayer: audioPlayer,
                    songs: [],
                    volume: 5,
                    playing: true,
                };

                playlist.songs.forEach(song => queueContract.songs.push(song));
                queue.set(guild.id, queueContract);

                const playlistEmbedMsg: MessageEmbed = DiscordUtils.constructEmbedPlaylist(playlist);
                textChannel.send({embeds: [playlistEmbedMsg]});
                
                // Calling the play function to start a song
                await this.play(guild, queueContract.songs[0], queue);
            } catch (err: any) {
                // Printing the error message if the bot fails to join the voicechat
                console.log(err);
                queue.delete(guild.id);
                return textChannel.send(err);
            }
        } else {
            serverQueue.songs = [];
            playlist.songs.forEach(song => serverQueue.songs.push(song));

            const playlistEmbedMsg: MessageEmbed = DiscordUtils.constructEmbedPlaylist(playlist);
            textChannel.send({embeds: [playlistEmbedMsg]});
            
            // Calling the play function to start a song
            await this.songFinishHandler(guild, serverQueue, queue);
        }
    }

    private async play(guild: Guild, song: ISong, queue: Map<string, IQueue>): Promise<void> {
        const serverQueue = queue.get(guild.id);

        if (!serverQueue) return;

        if (!song) {
            this.leaveChannel(serverQueue, queue, guild.id);
            return;
        }

        if (song.url) {
            try {
                const audioStream = await this.youtubeService.getAudioStream(song.url);

                const resource = createAudioResource(audioStream.stream, { inputType: audioStream.type });
                if (resource) {
                    serverQueue.songs[0].playing = true;
                    serverQueue.audioPlayer.play(resource);
                    serverQueue.audioPlayer.on('error', error => {
                        console.error("ERROR OCCURED on audio play");
                        console.error(error);
                        this.leaveChannel(serverQueue, queue, guild.id);
                        return;
                    });
                    serverQueue.audioPlayer.on(AudioPlayerStatus.Playing, () => {
                        console.log('The audio player has started playing!');
                        console.log(serverQueue.songs.find(song => song.playing));
                    });
                    serverQueue.audioPlayer.on(AudioPlayerStatus.Idle, () => this.songFinishHandler(guild, serverQueue, queue));
                    serverQueue.connection.subscribe(serverQueue.audioPlayer);

                    serverQueue.textChannel.send(`Start playing: **${song.title}**\n ${song.url}`);
                } else {
                    serverQueue.textChannel.send(`Got no audioo resource from YTDL API: **${song.title}**\n ${song.url}`);
                }
            } catch (err) {
                console.log(err);
                serverQueue.textChannel.send(`An error occured: \n${err}`);
            }
        } else {
            serverQueue.textChannel.send(`No track URL available for: **${song.title}**`);
        }
    }

    private async songFinishHandler(guild: Guild, serverQueue: IQueue, queue: Map<string, IQueue>): Promise<void> {
        const currentlyPlayingIndex = serverQueue.songs.findIndex(song => song.playing);
        if (currentlyPlayingIndex > -1) {
            serverQueue.songs.splice(currentlyPlayingIndex, 1);
        }

        serverQueue.songs.forEach(song => song.playing = false);
        if (serverQueue.songs.length > 0) {
            serverQueue.songs[0].playing = true;

            const nextTrack: ISong = serverQueue.songs[0];

            if (!nextTrack) {
                this.leaveChannel(serverQueue, queue, guild.id);
                return;
            } else {
                if (nextTrack.url) {
                    const audioStream = await this.youtubeService.getAudioStream(nextTrack.url);
                    const resource = createAudioResource(audioStream.stream, { inputType: audioStream.type });
                    serverQueue.audioPlayer.play(resource);
                    
                    const playlistEmbedMsg: MessageEmbed = DiscordUtils.constructEmbedPlaylist({ name: "Current Queue", songs: serverQueue.songs });
                    serverQueue.textChannel.send({embeds: [playlistEmbedMsg]});
                    serverQueue.textChannel.send(`Start playing: **${nextTrack.title}**\n ${nextTrack.url}`);
                } else {
                    serverQueue.textChannel.send(`No track URL available for: **${nextTrack.title}**`);
                }
            }
        } else {
            this.leaveChannel(serverQueue, queue, guild.id);
            return;
        }
    }


    private leaveChannel(serverQueue: IQueue, queue: Map<string, IQueue>, guildId: string) {
        serverQueue.connection.destroy();
        queue.delete(guildId);
    }
}