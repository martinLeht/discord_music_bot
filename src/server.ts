import { DiscordBot } from './bot/DiscordBot';
import { TYPES } from './config/types';
import container from './config/inversify.config';

const bot: DiscordBot = container.get<DiscordBot>(TYPES.Bot);

bot.listen();