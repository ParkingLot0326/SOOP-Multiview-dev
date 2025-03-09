export class AIDError extends Error {
    constructor(error: string) {
        super("AID not found in response: " + error);
        this.name = "AIDError";
    }
}

export class PlaylistError extends Error {
    constructor(error: string) {
        super("Playlist URL not found in response: " + error);
        this.name = "PlaylistError";
    }
}