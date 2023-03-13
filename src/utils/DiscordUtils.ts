import { EmbedBuilder } from "discord.js";
import { IPlaylist } from "../api/models/IPlaylist";

export class DiscordUtils {


    public static constructEmbedPlaylist(playlist: IPlaylist): EmbedBuilder {

        const playlistContent = playlist.songs.map((song, i) => {
            if (song.playing) return `* ${i + 1}. **${song.title}**`
            return `${i + 1}. **${song.title}**`
        })

        const playlistMessage: EmbedBuilder = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`${playlist.name}`)
            .setThumbnail('https://wallpaperaccess.com/full/2840971.jpg')
            .setDescription(playlistContent.join('\r\n'));

        return playlistMessage;
    }
}