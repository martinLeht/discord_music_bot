import ytdl from "ytdl-core";
import { Guild, Message } from "discord.js";
import { Command } from "../Command";
import { AbstractCommand } from "../AbstractCommand";
import { ISong } from "../../song/ISong";
import { IQueue } from "../../song/IQueue";

const ytsr = require('ytsr');


export class PlayCommand extends AbstractCommand {

    public readonly name: Command = Command.play;

    public async execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any> {
        
        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) {
            return message.channel.send(
                "You need to be in a voice channel to play music!"
            );
        }

        await this.checkPermissions(message, voiceChannel);

        if (!args) {
            return message.channel.send(
                "You need provide arguments (url or vide title) to play!"
            );
        }
        const song: ISong | null = await this.fetchSong(args);

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

    private async fetchSong(args: string[]): Promise<ISong | null> {
        let song: ISong | null = null;
        if (args[0].includes("www.youtube.com/watch?")) {
            const songInfo = await ytdl.getInfo(args[0]);
            song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };
        } else {
            const searchKeywords = args.join(" ");
            const songInfo = await ytsr(searchKeywords, { pages: 1 });
            song = {
                title: songInfo.items[0].title,
                url: songInfo.items[0].url
            };
        }
        return song;
    }

    private play(guild: Guild, song: ISong, queue: Map<string, IQueue>): void {
        const serverQueue = queue.get(guild.id);

        if (!serverQueue) return;

        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on("finish", () => {
                serverQueue.songs.shift();
                this.play(guild, serverQueue.songs[0], queue);
            })
            .on("error", (error: Error) => console.error(error));

        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Start playing: **${song.title}**\n ${song.url}`);
    }
}