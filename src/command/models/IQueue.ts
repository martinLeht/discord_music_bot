import { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import { ISong } from "../../api/models/ISong";

export interface IQueue {
    textChannel: any;
    voiceChannel: VoiceBasedChannel;
    connection: VoiceConnection;
    audioPlayer: AudioPlayer;
    songs: ISong[];
    volume: number;
}