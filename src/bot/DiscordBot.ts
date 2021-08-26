import { Client, Collection, Guild, Message, User } from "discord.js";
import { inject, injectable } from "inversify";
import { commands } from '../command';
import { TOKEN, PREFIX } from "../config/config";
import { TYPES } from "../config/types";
import { Command } from "../command/Command";
import { ICommand } from "../command/ICommand";
import { IQueue } from "../song/IQueue";

@injectable()
export class DiscordBot {
    private client: Client;
    private commands: Collection<Command, ICommand>;
    private queue: Map<string, IQueue>;
    private readonly token: string = TOKEN;

    constructor(
        @inject(TYPES.Client) client: Client
    ) {
        this.client = client;
        this.commands = new Collection();
        this.queue = new Map();
        this.initCommands();
    }

    private initCommands(): void {
        for (const cmd of commands) {
            this.commands.set(cmd.name, cmd);
        }
    }

    public listen(): Promise < string > {
        this.client.on('message', async (message: Message) => {
            if (message.content.startsWith('!join') && message.member?.voice.channel) {
                message.member.voice.channel.join();
            } else if (message.content.startsWith('!leave') && message.member?.voice.channel) {
                message.member.voice.channel.leave();
            } else {
                if (!message.content.startsWith(PREFIX) || message.author.bot) return;

                const args: string[] = message.content.slice(PREFIX.length).trim().split(' ');
                let cmdKey = args.shift();
                if (!cmdKey) return;

                cmdKey = cmdKey.toLowerCase();
                let cmd = this.getCommand(cmdKey); 
                
                if (!cmd) return;
                try {
                    await cmd.execute(message, args, this.queue);
                } catch (err) {
                    console.log('Something went wrong...\n' + err);
                    message.reply('Something went wrong...\n' + err);
                }
            }

            
        });

        this.client.once('ready', () => {
            console.log('Ready!');
        });

        this.client.once('reconnecting', () => {
            console.log('Reconnecting!');
        });

        this.client.once('disconnect', () => {
            console.log('Disconnect!');
        });

        this.client.on('error', (err: Error) => {
            console.log(err);
        });
        
        return this.client.login(this.token);
    }

    private getCommand(cmdKey: string): ICommand | undefined {
        const cmd: Command = Command[cmdKey as keyof typeof Command];
        return this.commands.get(cmd);
    }
}