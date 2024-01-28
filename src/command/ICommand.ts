import { Message } from "discord.js";
import { IQueue } from "./models/IQueue";
import { Command } from "./Command";

export interface ICommand {
    readonly name: Command;
    execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<void>;
    isMemberInVoiceChannel(message: Message): boolean;
    hasPermissions(message: Message): boolean;
    leaveChannel(serverQueue: IQueue, queue: Map<string, IQueue>, guildId: string): void;
}