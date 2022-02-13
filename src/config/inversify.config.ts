import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types";
import { DiscordBot } from "../bot/DiscordBot";
import { Client } from "discord.js";
import { YoutubeService } from "../api/services/YoutubeService";
import { PlayCommand } from "../command/play/PlayCommand";
import { SkipCommand } from "../command/skip/SkipCommand";
import { StopCommand } from "../command/stop/StopCommand";
import { InfoCommand } from "../command/info/InfoCommand";
import { ICommand } from "../command/ICommand";
import { CommandFactory } from "../command/CommandFactory";
import { SpotifyService } from "../api/services/SpotifyService";

let container = new Container();
const client = new Client();

container.bind<DiscordBot>(TYPES.Bot).to(DiscordBot).inSingletonScope();
container.bind<Client>(TYPES.Client).toConstantValue(client);

/* Commands */
container.bind<CommandFactory>(TYPES.CommandFactory).to(CommandFactory).inSingletonScope();
container.bind<ICommand>(TYPES.Play).to(PlayCommand).inSingletonScope();
container.bind<ICommand>(TYPES.Skip).to(SkipCommand).inSingletonScope();
container.bind<ICommand>(TYPES.Stop).to(StopCommand).inSingletonScope();
container.bind<ICommand>(TYPES.Info).to(InfoCommand).inSingletonScope();

/* Services */
container.bind<YoutubeService>(TYPES.YoutubeService).to(YoutubeService).inSingletonScope();
container.bind<SpotifyService>(TYPES.SpotifyService).to(SpotifyService).inSingletonScope();


export default container;