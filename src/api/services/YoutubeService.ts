import { injectable } from "inversify";
import ytdl from "ytdl-core-discord";
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
        const audioStream = await ytdl(songUrl, { quality: 'highestaudio', filter: 'audioonly' });
        return audioStream;
    }

}