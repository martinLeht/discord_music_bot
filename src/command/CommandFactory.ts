import { ICommand } from "./ICommand";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types";
import { Command } from "./Command";

@injectable()
export class CommandFactory {

    private commands: ICommand[];

    constructor(
        @inject(TYPES.Play) playCommand: ICommand,
        @inject(TYPES.Skip) skipCommand: ICommand,
        @inject(TYPES.Stop) stopCommand: ICommand,
        @inject(TYPES.Info) infoCommand: ICommand,
        @inject(TYPES.Queue) queueCommand: ICommand
    ) {
        this.commands = [
            playCommand,
            skipCommand,
            stopCommand,
            infoCommand,
            queueCommand
        ];
    }

    getCommand(command: Command): ICommand | undefined {
        return this.commands.find(cmd => cmd.name === command);
    }

}