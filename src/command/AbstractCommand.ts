import { Message, Permissions, PermissionsBitField } from "discord.js";
const { TextChannel } = require('discord.js');
import { IQueue } from "./models/IQueue";
import { Command } from "./Command";
import { ICommand } from "./ICommand";
import { Option } from "./Option";
import { OPT_PREFIX } from "../config/config";
import { IOption } from "./IOption";
import { injectable } from "inversify";

@injectable()
export abstract class AbstractCommand implements ICommand {
    abstract readonly name: Command;

    public readonly options: Option[] | undefined
    
    public abstract execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any>;

    public isMemberInVoiceChannel(message: Message): boolean {
        const voiceChannel = message.member?.voice.channel;
        return voiceChannel !== undefined && voiceChannel !== null;
    }

    public async hasPermissions(message: Message): Promise<boolean> {
        if (!message.client.user) return false;
        const permissions = await message.client.user.fetchFlags();

        if (!message.member?.permissions.has(PermissionsBitField.Flags.Connect) || !message.member?.permissions.has(PermissionsBitField.Flags.Speak)) {
            return false;
        }
        return true;
    }

    public getOptions(textChannel: any, args: string[]): IOption[] {
        let optArgs: IOption[] = [];
        for (let arg of args) {
            if (this.isOptionArg(arg)) {
                /**
                 * Option can hold a value. 
                 * If so, the option is followed by "=" and the value
                 */
                const optArg = arg.split("=");
                const opt = this.getOption(optArg[0].substr(1));
                if (opt !== undefined) {
                    optArgs.push({
                        name: opt,
                        value: optArg[1] ? optArg[1] : undefined
                    });
                } else {
                    textChannel.send({content: `Invalid option for command !${this.name}: **${optArg[0]}**\n`
                    + `Checkout available options for each command by typing **!info** in the chat.` });
                }
            }
        }
        return optArgs;
    }

    public isOptionArg(arg: string): boolean {
        return arg.startsWith(OPT_PREFIX) && arg.length > 1
    }

    private getOption(optKey: string): Option | undefined {
        const opt: Option = Option[optKey as keyof typeof Option];
        if (this.options !== undefined) {
            for (let option of this.options) {
                if (opt === option) {
                    return option;
                }
            }
        }
        
        return undefined;
    }
}