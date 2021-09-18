import { IOption } from "../command/IOption";

export interface ISong {
    title: string;
    url: string;
    opts?: IOption[];
}