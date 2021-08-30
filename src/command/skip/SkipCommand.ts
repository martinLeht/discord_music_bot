import { Guild, Message } from "discord.js";
import { IQueue } from "../../song/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";

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
        serverQueue.connection.dispatcher.end();
    }
        
}