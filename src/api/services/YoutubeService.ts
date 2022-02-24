import { AudioResource, createAudioResource, demuxProbe } from "@discordjs/voice";
import { injectable } from "inversify";
import ytdl from "ytdl-core";
//import { exec as ytdlExec } from 'youtube-dl-exec';
import { stream } from 'play-dl';
import { ISong } from "../models/ISong";
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
        const songInfo = await ytsr(searchTerm, { pages: 1 });
        /* Debug purposes
        const info = await ytdl.getInfo(songInfo.items[0].url);
        console.log(info);
        */
        let song: ISong | null = null;
        if (songInfo && songInfo.items[0]) {
            song = {
                title: songInfo.items[0].title,
                url: songInfo.items[0].url
            };
        }

        return song;
    }

    public async getSongByUrl(url: string): Promise<ISong | null> {
        const songInfo = await ytdl.getInfo(url);

        let song: ISong | null = null;
        if (songInfo && songInfo.videoDetails) {
            song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };
        }
        
        return song;
    }

    public async getAudioStream(songUrl: string) {
        //const audioStream = await ytdl(songUrl, { quality: 'highestaudio', filter: 'audioonly' });
        const audioStream = await stream(songUrl)
        return audioStream;
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