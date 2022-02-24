import { Message, TextChannel, VoiceChannel } from "discord.js";
import { IQueue } from "./models/IQueue";
import { Command } from "./Command";

export interface ICommand {
    readonly name: Command;
    execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any>;
    isMemberInVoiceChannel(message: Message): boolean ;
    hasPermissions(message: Message, voiceChannel: VoiceChannel): boolean;
}