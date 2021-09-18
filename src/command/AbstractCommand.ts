import { Message, VoiceChannel } from "discord.js";
import { IQueue } from "../song/IQueue";
import { Command } from "./Command";
import { ICommand } from "./ICommand";
import { Option } from "./Option";
import { OPT_PREFIX } from "../config/config";
import { IOption } from "./IOption";

export abstract class AbstractCommand implements ICommand {
    abstract readonly name: Command;

    public readonly options: Option[] | undefined
    
    public abstract execute(message: Message, args: string[], queue: Map<string, IQueue>): Promise<any>;

    public isMemberInVoiceChannel(message: Message): boolean {
        const voiceChannel = message.member?.voice.channel;
        return voiceChannel !== undefined && voiceChannel !== null;
    }

    public hasPermissions(message: Message, voiceChannel: VoiceChannel): boolean {
        if (!message.client.user) return false;
        const permissions = voiceChannel.permissionsFor(message.client.user);

        if (!permissions?.has("CONNECT") || !permissions.has("SPEAK")) {
            return false;
        }
        return true;
    }

    public getOptions(message: Message, args: string[]): IOption[] {
        let optArgs: IOption[] = [];
        for (const arg of args) {
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
                    message.channel.send(`Invalid option for command !play: **-${optArg[0]}**\n`
                                        + `Checkout available options for each command by typing **!info** in the chat.`);
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
            for (const option of this.options) {
                if (opt === option) {
                    return option;
                }
            }
        }
        
        return undefined;
    }
}