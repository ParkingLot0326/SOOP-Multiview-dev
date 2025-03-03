
import { invoke } from '@tauri-apps/api/core';
import type { LiveInfoResponse } from './LiveInfoResponse';

export class LiveRequest {
    private _liveInfo?: LiveInfoResponse | undefined;
    public get liveInfo(): LiveInfoResponse | undefined {
        return this._liveInfo;
    }
    public set liveInfo(value: LiveInfoResponse | undefined) {
        this._liveInfo = value;
    }

    private bid: string;
    private bno?: string;

    private AID?: string;
    private playlist_url?: string

    private quality?: string
    private password?: string

    constructor(url: string) {
        if (!this.checkUrl(url)) {
            throw new Error("Invalid URL")
        }
        url = url.replaceAll("https://", "http://")
        url = url.replaceAll("http://", "")
        let url_arr = url.split("/")

        this.bid = url_arr[1];
        if (url_arr.length > 2) {
            this.bno = url_arr[2] as string;
        }

        console.log("bid: ", this.bid, "bno: ", this.bno)
    }

    private checkUrl(strUrl: string) {
        return strUrl.includes("play.sooplive.co.kr")
        // let expUrl = /^http[s]?:\/\/([\S]{3,})/i;
        // let test1 = expUrl.test(strUrl);

        // let test2 = strUrl.includes("play.sooplive.co.kr")
    }

    async post_live_info() {
        const live_info: Promise<void | object> = invoke<object>(
            "check_live",
            { bid: this.bid }).catch((error) => { console.error(error); });
        try {
            let liveInfo = await live_info as LiveInfoResponse;

            this.liveInfo = liveInfo
            this.bno = liveInfo.BNO?.toString();
            return liveInfo
        }
        catch (error) {
            throw new Error(`Error from Rust: ${error}`)
        }
    }

    private async post_live_playlist(quality: string, password: string) {
        if (this.liveInfo == undefined) {
            throw new Error("Fetch Liveinfo First")
        }

        const stream_url = await invoke<string>("get_stream_url", { bno: this.bno, cdn: this.liveInfo.CDN, quality: quality }).catch((error) => { console.error(error); });
        const aid_key = await invoke<string>("post_aid", { bno: this.bno, quality: quality, password: password }).catch((error) => { console.error(error); });

        return [stream_url, aid_key]
    }

    public async get_playlist(quality?: string, password?: string) {
        if (quality == this.quality && password == this.password && this.playlist_url != undefined) {
            return this.playlist_url
        }

        if (quality != this.quality || password != this.password) {
            this.quality = quality;
            this.password = password;

            if (password == undefined) {
                password = ""
            }

            if (quality == undefined) {
                quality = "original"
            }

            return await this.post_live_playlist(quality as string, password as string)
        }
    }

    public purge() {
        this.quality = undefined
        this.password = undefined
        this.playlist_url = undefined
    }

}