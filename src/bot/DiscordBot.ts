import { Client } from "discord.js";
import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { inject, injectable } from "inversify";
import { CommandFactory } from '../command/CommandFactory';
import { TOKEN, PREFIX } from "../config/config";
import { TYPES } from "../config/types";
import { Command } from "../command/Command";
import { ICommand } from "../command/ICommand";
import { IQueue } from "../command/models/IQueue";

@injectable()
export class DiscordBot {
    private client: Client;
    private commandFactory: CommandFactory;
    private queue: Map<string, IQueue>;
    private readonly token: string = TOKEN;

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.CommandFactory) commandFactory: CommandFactory
    ) {
        this.client = client;
        this.commandFactory = commandFactory;
        this.queue = new Map();
    }

    public listen() {
        this.client.on('messageCreate', async (message) => {
            if (message.content.startsWith('!join') && message.member?.voice.channel && message.guild) {
                joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator
                });
            } else {
                if (message.content.startsWith(PREFIX) && !message.author.bot) {
                    const args: string[] = message.content.slice(PREFIX.length).trim().split(' ');
                    const cmd = this.getCommand(args); 
                    
                    if (!!cmd) {
                        try {
                            cmd.execute(message, args, this.queue);
                        } catch (err) {
                            console.log('Something went wrong...\n' + err);
                            message.reply('Something went wrong...\n' + err);
                            if (message.guild) {
                                const conn = getVoiceConnection(message.guild.id);
                                if (conn) conn.destroy();
                            }
                        }
                    }
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
            console.log(err.message);
        });

        this.client.login(this.token);
    }

    private getCommand(msgArgs: string[]): ICommand | undefined {
        let cmdKey = msgArgs.shift();
        if (!cmdKey) return undefined;

        cmdKey = cmdKey.toLowerCase();
        const cmd: Command = Command[cmdKey as keyof typeof Command];
        return this.commandFactory.getCommand(cmd);
    }
}