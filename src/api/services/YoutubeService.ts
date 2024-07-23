import { injectable } from "inversify";
import ytdl from "@distube/ytdl-core";
import { search, stream, YouTubeStream } from 'play-dl';
import { ISong } from "../models/ISong";
import { IPlaylist } from "../models/IPlaylist";
import { Readable } from "stream";

@injectable()
export class YoutubeService {

    public async getSongBySearch(searchTerm: string): Promise<ISong | null> {
        try {
            const songInfo = await search(searchTerm, {limit: 1})
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
            return await stream(songUrl, { 
                discordPlayerCompatibility: true                 
            });
        } catch (e: any) {
            console.log(e);
            console.log(e.message);
        }
        return null;
    }

    public async getAudioStreamYtdlCore(songUrl: string): Promise<Readable | null> {
        try {
            return ytdl(songUrl, { 
                filter: "audioonly",
                quality: "highestaudio",
                liveBuffer: 40000,
                highWaterMark: 1 << 25, 
            })
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
}