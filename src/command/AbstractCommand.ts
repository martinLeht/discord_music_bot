import { Message, VoiceChannel } from "discord.js";
import { IQueue } from "../song/IQueue";
import { Command } from "./Command";
import { ICommand } from "./ICommand";

export abstract class AbstractCommand implements ICommand {
    abstract readonly name: Command;
    
    public abstract execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any>;

    public async checkPermissions(message: Message, voiceChannel: VoiceChannel): Promise<any> {
        if (!message.client.user) return;
        const permissions = voiceChannel.permissionsFor(message.client.user);

        if (!permissions?.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "I need the permissions to join and speak in your voice channel!"
            );
        }
    }
}