import ytdl from "discord-ytdl-core";
import { Guild, Message } from "discord.js";
import { Command } from "../Command";
import { AbstractCommand } from "../AbstractCommand";
import { ISong } from "../../song/ISong";
import { IQueue } from "../../song/IQueue";
import { Option } from '../Option';
import { OPT_PREFIX } from "../../config/config";
import { IOption } from "../IOption";

const ytsr = require('ytsr');


export class PlayCommand extends AbstractCommand {

    public readonly name: Command = Command.play;

    public readonly options: Option[] = [
        Option.startAt
    ];

    private ytdlDownloadConfig: any = {
        filter: "audioonly",
        opusEncoded: true,
        encoderArgs: ['-af', 'bass=g=10,dynaudnorm=f=200']
    };

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        
        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) {
            return message.channel.send(
                "You need to be in a voice channel to play music!"
            );
        }

        if (!this.hasPermissions(message, voiceChannel)) {
            return message.channel.send(
                "I need the permissions to join and speak in your voice channel! These are the terms if you need me as a private DJ..."
            );
        }

        if (!args) {
            return message.channel.send(
                "You need provide arguments (url or vide title) to play!"
            );
        }
        
        const song: ISong | null = await this.fetchSong(message, args);

        if(!message.guild || !song) return;

        const guild: Guild = message.guild;
        const serverQueue = queue.get(guild.id);
        if (!serverQueue) {
            try {
                // Here we try to join the voicechat and save our connection into our object.
                const connection = await voiceChannel.join();
                const queueContract: IQueue = {
                    textChannel: message.channel,
                    voiceChannel: voiceChannel,
                    connection: connection,
                    songs: [],
                    volume: 5,
                    playing: true,
                };

                // Pushing the song to our songs array
                if (!song) return;
                queueContract.songs.push(song);
                queue.set(guild.id, queueContract);


                // Calling the play function to start a song
                this.play(guild, queueContract.songs[0], queue);
            } catch (err) {
                // Printing the error message if the bot fails to join the voicechat
                console.log(err);
                queue.delete(guild.id);
                return message.channel.send(err);
            }
        } else {
            serverQueue.songs.push(song);
            console.log(serverQueue.songs);
            return message.channel.send(`Added to the queue: **${song.title}**`);
        }

    }

    private async fetchSong(message: Message, args: string[]): Promise<ISong | null> {
        let song: ISong | null = null;

        // Extract options from arguments
        const opts: IOption[] = this.getOptions(message, args);
        args = args.filter(arg => !this.isOptionArg(arg));

        if (args[0].includes("www.youtube.com/watch?")) {
            const songInfo = await ytdl.getInfo(args[0]);
            song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };
        } else {
            const searchKeywords = args.join(" ");
            const songInfo = await ytsr(searchKeywords, { pages: 1 });
            /* Debug purposes
            const info = await ytdl.getInfo(songInfo.items[0].url);
            console.log(info);
            */
            song = {
                title: songInfo.items[0].title,
                url: songInfo.items[0].url
            };
        }
        
        if (opts.length > 0) {
            song.opts = opts;
        }

        return song;
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
    private play(guild: Guild, song: ISong, queue: Map<string, IQueue>): void {
        const serverQueue = queue.get(guild.id);

        if (!serverQueue) return;

        if (!serverQueue.connection || !song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }

        let audioStream = ytdl(song.url, this.ytdlDownloadConfig)
            .on('finish', () => this.songFinishHandler(guild, serverQueue, queue))
            .on('error', (error: Error) => {
                console.error(error);
                serverQueue.voiceChannel.leave();
                queue.delete(guild.id);
                return;
            });
        console.log(audioStream);
        const dispatcher = serverQueue.connection.play(audioStream, {
            type: "opus"
        });

        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Start playing: **${song.title}**\n ${song.url}`);
    }

    private songFinishHandler(guild: Guild, serverQueue: IQueue, queue: Map<string, IQueue>): void {
        serverQueue.songs.shift();
        this.play(guild, serverQueue.songs[0], queue);
    }
}