import { IOption } from "../../command/IOption";

export interface ISong {
    title: string;
    artists?: Array<string>;
    album?: string;
    url?: string;
    opts?: IOption[];
    playing?: boolean;
}