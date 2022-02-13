import { injectable } from "inversify";
import SpotifyWebApi from "spotify-web-api-node";
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } from "../../config/config";
import { IPlaylist } from "../models/IPlaylist";
import { ISong } from "../models/ISong";

@injectable()
export class SpotifyService {

    private spotifyApi: SpotifyWebApi;

    constructor() {
        this.spotifyApi = new SpotifyWebApi({
            clientId: SPOTIFY_CLIENT_ID,
            clientSecret: SPOTIFY_CLIENT_SECRET
        });
        this.initAccessToken();
    }
      
    private initAccessToken() {
        // Retrieve an access token.
        this.spotifyApi.clientCredentialsGrant().then((data) => {
            // Save the access token so that it's used in future calls
            this.spotifyApi.setAccessToken(data.body['access_token']);
        }, (err) => {
            console.log('Something went wrong when retrieving an access token', err);
        });
    } 

    private async refreshAccessToken() {
        // Retrieve an access token.
        try {
            const data = await this.spotifyApi.clientCredentialsGrant();
            // Save the access token so that it's used in future calls
            this.spotifyApi.setAccessToken(data.body['access_token']);
        } catch (err) {
            console.log('Something went wrong when retrieving an access token', err);
        }
    }

    public async getPlaylist(searchTerm: string, owner?: string) {
        try {
            const playlistData = await this.spotifyApi.searchPlaylists(searchTerm);
            if (playlistData.body.playlists) {
                let playlistFound;
                if (owner) {
                    playlistFound = playlistData.body.playlists.items.find(playlist => {
                        const displayName = playlist.owner.display_name;
                        console.log(playlist.owner);
                        if (displayName) {
                            console.log(playlist.owner);
                            const displayNameLower = displayName.toLocaleLowerCase();
                            const ownerLower = owner.toLocaleLowerCase();
                            console.log(displayNameLower);
                            console.log(owner);
                            return displayNameLower === ownerLower
                        }
                        return false;
                    });
                } else {
                    playlistFound = playlistData.body.playlists.items[0];
                }

                if (!playlistFound) return null;

                const playlistId = playlistFound.id;
                const playlistName = playlistFound.name;

                console.log(playlistData.body.playlists);

                /* Get max 50 tracks from playlist */
                const tracksData = await this.spotifyApi.getPlaylistTracks(playlistId, { limit: 50, offset: 1 });
                const tracks = tracksData.body.items;

                if (tracks.length > 0) {
                    const songs: ISong[] = tracks.map(trackData => {
                        return {
                            title: trackData.track.name,
                            artists: trackData.track.artists.map(artist => artist.name),
                            album: trackData.track.album.name
                        }
                    });

                    const playlist: IPlaylist = {
                        name: playlistName,
                        songs: songs
                    }

                    return playlist;
                }
            }
        } catch (err) {
            console.log('Something went wrong!', err);
            await this.refreshAccessToken()
        }
        return null;
    }
    
}