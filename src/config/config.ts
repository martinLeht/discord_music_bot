import * as dotenv from 'dotenv';
import { DotenvConfigOutput } from 'dotenv';


if (process.env.NODE_ENV === 'development') {
    let path = `${__dirname}/../../.env`;
    const result: DotenvConfigOutput = dotenv.config({ path: path });
    if (result.error) {
        throw result.error
    }
}

export const PORT = process.env.PORT;
export const TOKEN = process.env.TOKEN ? process.env.TOKEN : "";
export const PREFIX = process.env.CMD_PREFIX ? process.env.CMD_PREFIX : "!" ;
export const OPT_PREFIX = process.env.OPT_PREFIX ? process.env.OPT_PREFIX : "-" ;
export const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ? process.env.SPOTIFY_CLIENT_ID : "";
export const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ? process.env.SPOTIFY_CLIENT_SECRET : "";
