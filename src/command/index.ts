import { ICommand } from "./ICommand";
import { InfoCommand } from "./info/InfoCommand";
import { PlayCommand } from "./play/PlayCommand";
import { SkipCommand } from "./skip/SkipCommand";
import { StopCommand } from "./stop/StopCommand";

// Base file that exports all created coommands (this case only one)

const commands: ICommand[] = [
    new PlayCommand(),
    new SkipCommand(),
    new StopCommand(),
    new InfoCommand()
];

export {
    commands
};