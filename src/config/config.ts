import * as dotenv from 'dotenv';
import { DotenvConfigOutput } from 'dotenv';

let path = `${__dirname}/../../.env`;
const result: DotenvConfigOutput = dotenv.config({ path: path });
 
if (result.error) {
    throw result.error
}
export const PORT = process.env.PORT;
export const TOKEN = process.env.TOKEN ? process.env.TOKEN : "";
export const PREFIX = process.env.CMD_PREFIX ? process.env.CMD_PREFIX : "!" ;