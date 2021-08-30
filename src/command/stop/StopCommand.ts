import { Guild, Message } from "discord.js";
import { IQueue } from "../../song/IQueue";
import { AbstractCommand } from "../AbstractCommand";
import { Command } from "../Command";
import { ICommand } from "../ICommand";

export class StopCommand extends AbstractCommand implements ICommand {

    public readonly name: Command = Command.stop;

    public async execute(message: Message, _args: string[], queue: Map<string, IQueue>): Promise<any> {
        if (this.isMemberInVoiceChannel(message)) {
            return message.channel.send(
                "You have to be in a voice channel to stop the music!"
            );
        }

        if(!message.guild) return;

        const guild: Guild = message.guild;
        const serverQueue = queue.get(guild.id);
        if (!serverQueue){
            return message.channel.send("There is no song that I could stop!");
        }

        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }
}