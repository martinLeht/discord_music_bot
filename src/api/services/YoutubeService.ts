import { AudioResource, createAudioResource, demuxProbe } from "@discordjs/voice";
import { injectable } from "inversify";
import ytdl from "ytdl-core";
//import { exec as ytdlExec } from 'youtube-dl-exec';
import { search, stream, stream_from_info, video_info, YouTubeStream } from 'play-dl';
import { ISong } from "../models/ISong";
import { IPlaylist } from "../models/IPlaylist";
const ytsr = require('ytsr');

@injectable()
export class YoutubeService {

    private ytdlDownloadConfig: any = {
        filter: "audioonly",
        opusEncoded: true,
        encoderArgs: ['-af','dynaudnorm=f=200'],
        bitrate: 320,
        quality: "highestaudio",
        liveBuffer: 40000,
        highWaterMark: 1 << 25, 

    };

    public async getSongBySearch(searchTerm: string): Promise<ISong | null> {
        try {
            const songInfo = await search(searchTerm, {limit: 1})//await ytsr(searchTerm, { pages: 1 });
            /* Debug purposes
            const info = await ytdl.getInfo(songInfo.items[0].url);
            console.log(info);
            */
           /*
            if (songInfo && songInfo.items[0]) {
                return {
                    title: songInfo.items[0].title,
                    url: songInfo.items[0].url
                };
            }
            */
           if (songInfo && songInfo[0]) {
            return {
                title: songInfo[0].title,
                url: songInfo[0].url
            };
        }
        } catch (e: any) {
            console.log(e);
            console.log(e.message);
        }
        return null;
    }

    public async getSongByUrl(url: string): Promise<ISong | null> {
        try {
            const songInfo = await ytdl.getInfo(url);
            if (songInfo && songInfo.videoDetails) {
                return {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url
                };
            }
        } catch (e: any) {
            console.log(e);
            console.log(e.message);
        }
        return null;
    }

    public async getAudioStream(songUrl: string): Promise<YouTubeStream | null> {
        try {
            //const audioStream = await ytdl(songUrl, { quality: 'highestaudio', filter: 'audioonly' });
            /*
            const songInfo = await video_info(songUrl)
            const audioStream = await stream_from_info(songInfo, { discordPlayerCompatibility: true });
            */
            const audioStream = await stream(songUrl, { discordPlayerCompatibility: true });
            return audioStream;
        } catch (e: any) {
            console.log(e);
            console.log(e.message);
        }
        return null;
    }

    public async getSongsAsPlaylist(songsToSearch: ISong[], playlistName: string): Promise<IPlaylist | null> {
        try {
            const songs: ISong[] = await Promise.all(
                songsToSearch.map(async songData => {
                    const searchKeywords = `${songData.title} ${songData.artists?.join(" ")}`;
                    console.log(`Searchterms for playlist: ${searchKeywords}`);

                    // Fetch youtube URL:s for songs
                    const songFound = await this.getSongBySearch(searchKeywords);
                    if (songFound) songData.url = songFound.url;
                    await this.delay(500);
                    return songData;
                })
            );

            const songsWithUrlsFound: ISong[] = songs.filter(song => !!song.url);
            return {
                name: playlistName,
                songs: songsWithUrlsFound
            }
        } catch (e: any) {
            console.log(e);
            console.log(e.message);
        }
        return null;
    }

    private delay(timeMs: number, value?: any) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve(value);
            }, timeMs);
        });
    }

    /*
    public getAudioResource(url: string, callbackFunc?: (audioResource: AudioResource) => void): Promise<AudioResource<any> | null> {
        return new Promise((resolve, reject) => {
            console.log("Executing YTDL process");
            const ytdlProcess = ytdlExec(
                url,
                {
                    output: '-',
                    quiet: false,
                    format: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                    limitRate: '100K',
                },
                { stdio: ['ignore', 'pipe', 'ignore'] },
            );
            if (!ytdlProcess.stdout) {
                reject(new Error('No stdout'));
				return;
            }
            const stream = ytdlProcess.stdout;
    
            try {
                ytdlProcess
                    .once('spawn', async () => {
                        const probeInfo = await demuxProbe(stream);
                        console.log("Demux probe:");
                        console.log(probeInfo);
                        if (probeInfo) {
                            const audioResource = createAudioResource(probeInfo.stream, { inputType: probeInfo.type });
                            console.log(audioResource);
                            console.log(callbackFunc);
                            if (callbackFunc) callbackFunc(audioResource);
                            resolve(audioResource);
                        }
                        resolve(null);
                    });
            } catch (err) {
                console.log("Error on audiostream creation:");
                console.log(err);
                if (!ytdlProcess.killed) ytdlProcess.kill();
                stream.resume();
                reject(err);
            }

        });
        
        
	}
*/
}