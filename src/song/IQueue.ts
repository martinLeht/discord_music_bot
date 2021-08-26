import { DMChannel, NewsChannel, TextChannel, VoiceChannel, VoiceConnection } from "discord.js";
import { ISong } from "./ISong";

export interface IQueue {
    textChannel: TextChannel | DMChannel | NewsChannel;
    voiceChannel: VoiceChannel;
    connection: VoiceConnection;
    songs: ISong[];
    volume: number;
    playing: boolean;
}