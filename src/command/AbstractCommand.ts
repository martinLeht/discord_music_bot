import { Message, VoiceChannel } from "discord.js";
import { IQueue } from "../song/IQueue";
import { Command } from "./Command";
import { ICommand } from "./ICommand";

export abstract class AbstractCommand implements ICommand {
    abstract readonly name: Command;
    
    public abstract execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any>;

    public isMemberInVoiceChannel(message: Message): boolean {
        const voiceChannel = message.member?.voice.channel;
        return !voiceChannel;
    }

    public hasPermissions(message: Message, voiceChannel: VoiceChannel): boolean {
        if (!message.client.user) return false;
        const permissions = voiceChannel.permissionsFor(message.client.user);

        if (!permissions?.has("CONNECT") || !permissions.has("SPEAK")) {
            return false;
        }
        return true;
    }
}