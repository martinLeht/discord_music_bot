import { Guild, Message } from "discord.js";
import { IQueue } from "../models/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { injectable } from "inversify";

@injectable()
export class SkipCommand extends AbstractCommand {

    public readonly name: Command = Command.skip;

    public async execute(message: Message, _args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (!this.isMemberInVoiceChannel(message)) {
            return message.channel.send(
                "You have to be in a voice channel to skip a song!"
            );
        }
        
        if(!message.guild) return;

        const guild: Guild = message.guild;
        const serverQueue = queue.get(guild.id);

        if (!serverQueue) {
            return message.channel.send("There is no song that I could skip!");
        }

        if (!serverQueue.connection || !serverQueue.connection.dispatcher) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return message.channel.send("Something went wrong on song dispatching...");
        }
        serverQueue.connection.dispatcher.end();
    }
        
}