import { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import { TextChannel, VoiceChannel } from "discord.js";
import { ISong } from "../../api/models/ISong";

export interface IQueue {
    textChannel: any;
    voiceChannel: VoiceChannel;
    connection: VoiceConnection;
    audioPlayer: AudioPlayer;
    songs: ISong[];
    volume: number;
    playing: boolean;
}