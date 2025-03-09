
import { invoke } from '@tauri-apps/api/core';
import type { LiveInfoResponse } from './liveInfoResponse';
import { AIDError, PlaylistError } from './liveErrors';

class streamInfo {
    uri: string;
    name: string;
    bandwidth: number;
    resolution: string;

    constructor(uri: string, name: string, bandwidth: number, resolution: string) {
        this.uri = uri;
        this.name = name;
        this.bandwidth = bandwidth;
        this.resolution = resolution;
    }
}
export class LiveRequest {
    private _liveInfo?: LiveInfoResponse | undefined;

    public get liveInfo(): LiveInfoResponse | undefined {
        return this._liveInfo;
    }

    private set liveInfo(value: LiveInfoResponse | undefined) {
        this._liveInfo = value;
    }

    private bid?: string;
    private bno?: string;

    private AID?: string;
    private playlist_url?: string

    private quality?: string
    private password?: string

    private _quality_mapping = new Map(
        [
            ["1440p", 16000000],
            ["1080p", 8000000],
            ["720p", 1382400],
            ["540p", 777600],
            ["360p", 345600]
        ]
    )

    private get quality_mapping() {
        return this._quality_mapping
    }


    public setup(input: string): string {

        if (this.checkUrl(input)) {
            input = input.replaceAll("https://", "http://")
            input = input.replaceAll("http://", "")
            let url_arr = input.split("/")

            this.bid = url_arr[1];
            if (url_arr.length > 2) {
                this.bno = url_arr[2] as string;
            }
        } else if (input.split(" ").length == 1) {
            this.bid = input
        } else {
            throw new Error("Invalid URL or BJID")
        }

        console.log("bid: ", this.bid, "bno: ", this.bno)
        return this.bid
    }

    private checkUrl(strUrl: string) {
        return strUrl.includes("play.sooplive.co.kr")
        // let expUrl = /^http[s]?:\/\/([\S]{3,})/i;
        // let test1 = expUrl.test(strUrl);

        // let test2 = strUrl.includes("play.sooplive.co.kr")
    }

    private async post_live_info() {
        const live_info: Promise<void | object> = invoke<object>(
            "check_live",
            { bid: this.bid }).catch((error) => { console.error(error); });
        try {
            let liveInfo = await live_info as LiveInfoResponse;

            liveInfo.BJID = this.bid;
            this.bno = liveInfo.BNO ? liveInfo.BNO.toString() : undefined;
            return liveInfo
        }
        catch (error) {
            throw new Error(`Error from Rust: ${error}`)
        }
    }

    private async post_live_playlist(quality: string, password?: string) {

        if (password == undefined) {
            password = "";
        }

        if (this.liveInfo == undefined) {
            this.liveInfo = await this.post_live_info()
        } else if (this.liveInfo?.CDN == undefined || this.liveInfo.BNO == undefined) {
            throw new Error("Essential Data not found")
        }

        let aid_key: string | void;
        let stream_url: string | void;
        try {
            stream_url = await invoke<string>("get_stream_url", { bno: this.bno, cdn: this.liveInfo!.CDN, quality: quality });
        } catch (error) {
            throw new PlaylistError(error as string)
        }
        try {
            aid_key = await invoke<string>("post_aid", { bno: this.bno, quality: quality, password: password });
        } catch (error) {
            throw new AIDError(error as string)
        }

        if (stream_url == undefined || aid_key == undefined) {
            throw new Error("Failed to get stream url or aid key")
        }

        return [stream_url, aid_key]
    }

    public async get_playlist(quality?: string, password?: string) {
        if (quality == this.quality && password == this.password && this.playlist_url != undefined) {
            return this.playlist_url
        }

        this.quality = quality;
        this.password = password;

        if (password == undefined) {
            password = ""
        }

        if (quality == undefined) {
            quality = "master"
        }

        let pair = await this.post_live_playlist(quality as string, password as string)
        return this.reconstruct_url(pair[0], pair[1])

    }

    private reconstruct_url(stream_url: string, aid_key: string) {
        return `http://proxy.localhost/stream?url=${encodeURIComponent(stream_url)}&method=GET&query=${encodeURIComponent(JSON.stringify({ aid: aid_key }))}`
    }

    public async get_master_stream(password?: string) {
        if (password == undefined) {
            password = ""
        }

        let master_playlist = '#EXTM3U\n';
        if (this.liveInfo == undefined) {
            this.liveInfo = await this.post_live_info()
        }
        try {
            let streams = []
            for (let preset of this.liveInfo!.VIEWPRESET!) {
                if (preset.name == "auto") { continue }

                console.log("loading preset of: ", preset.name)
                let pair = await this.post_live_playlist(preset.name, password)
                streams.push(
                    new streamInfo(
                        this.reconstruct_url(pair[0], pair[1]),
                        preset.name,
                        this.quality_mapping.get(preset.label) as number,
                        `${preset.label_resolution * 16 / 9}x${preset.label_resolution}`
                    )
                )
            }
            for (let stream of streams) {
                master_playlist += `#EXT-X-STREAM-INF:NAME=${stream.name},BANDWIDTH=${stream.bandwidth},RESOLUTION=${stream.resolution}\n${stream.uri}\n`
            }
            const blob = new Blob([master_playlist], { type: 'application/vnd.apple.mpegurl' });
            return URL.createObjectURL(blob);
        } catch (error) {
            throw new Error(`Failed Building MasterPlaylist: ${error}`)
        }
    }

    public purge() {
        this.bid = undefined
        this.bno = undefined
        this.liveInfo = undefined
        this.AID = undefined
        this.quality = undefined
        this.password = undefined
        this.playlist_url = undefined
    }

}