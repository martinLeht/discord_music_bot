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
        this.spotifyApi.clientCredentialsGrant().then((data: any) => {
            // Save the access token so that it's used in future calls
            this.spotifyApi.setAccessToken(data.body['access_token']);
        }, (err: any) => {
            console.log('Something went wrong when retrieving an access token', err);
        });
    } 

    private async refreshAccessToken() {
        // Retrieve an access token.
        try {
            const data = await this.spotifyApi.clientCredentialsGrant();
            // Save the access token so that it's used in future calls
            this.spotifyApi.setAccessToken(data.body['access_token']);
        } catch (err: any) {
            console.log('Something went wrong when retrieving an access token', err);
        }
    }

    public async getPlaylist(searchTerm: string, owner?: string) {
        try {
            let playlistData;
            if (owner) {
                playlistData = await this.searchPlaylistByOwner(searchTerm, owner);
            } else {
                playlistData = await this.spotifyApi.searchPlaylists(searchTerm);
                if (playlistData.statusCode === 200) {
                    console.log(playlistData.body.playlists);
                    playlistData = playlistData.body.playlists?.items[0];
                } else if (playlistData.statusCode === 401) {
                    console.log("Spotify access token has expired, refreshing the client access token!");
                    await this.refreshAccessToken();
                    return null;
                } else {
                    throw new Error("STATUS CODE: " + playlistData.statusCode);
                }
            }

            if (!playlistData) return null;
    
            const playlistId = playlistData.id;
            const playlistName = playlistData.name;

            /* Get max 50 tracks from playlist */
            const tracksData = await this.spotifyApi.getPlaylistTracks(playlistId, { limit: 50 });
            const tracks = tracksData.body.items;

            if (tracks.length > 0) {
                const songs: ISong[] = tracks.map((trackData: any) => {
                    return {
                        title: trackData.track.name,
                        artists: trackData.track.artists.map((artist: any) => artist.name),
                        album: trackData.track.album.name
                    }
                });

                const playlist: IPlaylist = {
                    name: playlistName,
                    songs: songs
                }

                return playlist;
            }
        } catch (err) {
            console.log('Something went wrong!', err);
        }
        return null;
    }

    private async searchPlaylistByOwner(searchTerm: string, owner: string) {
        let offsetPage = 0;
        while (offsetPage > -1 && offsetPage < 20) {
            const playlistData = await this.spotifyApi.searchPlaylists(searchTerm, { limit: 50, offset: offsetPage });
            if (playlistData.statusCode === 200) {
                console.log(playlistData.body);
                if (playlistData.body.playlists) {
                    const playlistMatch = playlistData.body.playlists.items.find((playlist: any) => {
                        const displayName = playlist.owner.display_name;
                        if (displayName) {
                            const displayNameLower = displayName.toLocaleLowerCase();
                            const ownerLower = owner.toLocaleLowerCase();
                            return displayNameLower === ownerLower
                        }
                        return false;
                    });

                    if (playlistMatch) {
                        return playlistMatch;
                    } else {
                        if (playlistData.body.playlists.next !== null) {
                            offsetPage++;
                            await this.delay(300);
                        } else {
                            offsetPage = -1;
                            return null;
                        }
                    }
                } else {
                    break;
                }
            } else if (playlistData.statusCode === 401) {
                console.log("Spotify access token has expired, refreshing the client access token!");
                await this.refreshAccessToken();
                return null;
            } else {
                console.log("STATUS CODE: " + playlistData.statusCode);
                return null;
            }
        }
        return null;
    }

    private delay(timeMs: number, value?: any) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                resolve(value);
            }, timeMs);
        });
    }

    public async getPlaylistById(id: string) {
        try {
            const playlistData = await this.spotifyApi.getPlaylist(id);
            console.log(playlistData);
            if (playlistData.statusCode === 200) {
                const playlistName = playlistData.body.name;
    
                /* Get max 50 tracks from playlist */
                const tracksData = await this.spotifyApi.getPlaylistTracks(id, { limit: 50, offset: 0 });
                const tracks = tracksData.body.items;
    
                console.log(tracksData.body)
    
                if (tracks.length > 0) {
                    const songs: ISong[] = tracks.map((trackData: any) => {
                        return {
                            title: trackData.track.name,
                            artists: trackData.track.artists.map((artist: any) => artist.name),
                            album: trackData.track.album.name
                        }
                    });
    
                    const playlist: IPlaylist = {
                        name: playlistName,
                        songs: songs
                    }
    
                    return playlist;
                }
            } else if (playlistData.statusCode === 401) {
                console.log("Spotify access token has expired, refreshing the client access token!");
                await this.refreshAccessToken();
            } else {
                throw new Error("STATUS CODE: " + playlistData.statusCode);
            }
        } catch (err) {
            console.log('Something went wrong!', err);
        }
        return null;
    }

    public async getAlbum(searchTerm: string, owner?: string) {
        try {
            const albumData = await this.spotifyApi.searchAlbums(searchTerm, { limit: 50, offset: 0 });
            if (albumData.statusCode === 200) {
                if (albumData.body.albums) {
                    let albumFound;
                    if (owner) {
                        albumFound = albumData.body.albums.items.find((albumFound: any) => {
                            const displayName = albumFound.owner.display_name;
                            if (displayName) {
                                const displayNameLower = displayName.toLocaleLowerCase();
                                const ownerLower = owner.toLocaleLowerCase();
                                return displayNameLower === ownerLower
                            }
                            return false;
                        });
                    } else {
                        albumFound = albumData.body.albums.items[0];
                    }
    
                    if (!albumFound) return null;
    
                    const albumId = albumFound.id;
                    const albumName = albumFound.name;
    
                    /* Get max 50 tracks from album */
                    const tracksData = await this.spotifyApi.getAlbumTracks(albumId, { limit: 50, offset: 0 });
                    const tracks = tracksData.body.items;
                    if (tracks.length > 0) {
                        const songs: ISong[] = tracks.map((trackData: any) => {
                            return {
                                title: trackData.name,
                                artists: trackData.artists.map((artist: any) => artist.name),
                                album: albumName
                            }
                        });
    
                        const album: IPlaylist = {
                            name: albumName,
                            songs: songs
                        }
    
                        return album;
                    }
                }
            } else if (albumData.statusCode === 401) {
                console.log("Spotify access token has expired, refreshing the client access token!");
                await this.refreshAccessToken();
            } else {
                throw new Error("STATUS CODE: " + albumData.statusCode);
            }
            
        } catch (err) {
            console.log('Something went wrong!', err);
        }
        return null;
    }

    public async getAlbumById(id: string) {
        try {
            const albumData = await this.spotifyApi.getAlbum(id);
            if (albumData.statusCode === 200) {
                console.log(albumData);
                if (!albumData.body) return null;
                
                const albumName = albumData.body.name;
    
                /* Get max 50 tracks from playlist */
                const tracksData = await this.spotifyApi.getAlbumTracks(id, { limit: 50, offset: 0 });
                const tracks = tracksData.body.items;
    
                console.log(tracksData.body);
                console.log(tracks);
    
                if (tracks.length > 0) {
                    const songs: ISong[] = tracks.map((trackData: any) => {
                        return {
                            title: trackData.name,
                            artists: trackData.artists.map((artist: any) => artist.name),
                            album: albumName
                        }
                    });
    
                    const album: IPlaylist = {
                        name: albumName,
                        songs: songs
                    }
    
                    return album;
                }
            } else if (albumData.statusCode === 401) {
                console.log("Spotify access token has expired, refreshing the client access token!");
                await this.refreshAccessToken();
            } else {
                throw new Error("STATUS CODE: " + albumData.statusCode);
            }
        } catch (err) {
            console.log('Something went wrong! ', err);
        }
        return null;
    }
    
}