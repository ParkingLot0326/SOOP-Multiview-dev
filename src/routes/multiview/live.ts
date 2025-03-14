
import type { LiveInfoResponse } from './LiveInfoResponse';
import { AIDError, PlaylistError } from './liveErrors';
import { proxy_url } from '../utils/util';

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

export class LiveFetcher {
    private _liveInfo?: LiveInfoResponse | undefined;

    public get liveInfo(): LiveInfoResponse | undefined {
        return this._liveInfo;
    }

    private set liveInfo(value: LiveInfoResponse | undefined) {
        this._liveInfo = value;
    }

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

    private async get_stream_url(info: LiveInfoResponse, quality: string): Promise<string> {
        let cdn_val: string;

        switch (info.CDN) {
            case "gs_cdn": { cdn_val = "gs_cdn_pc_web"; break; };
            case "gcp_cdn": { cdn_val = "gcp_cdn"; break; };
            default: { cdn_val = "gs_cdn_pc_web"; break; };
        }

        const broad_key: string = `${info.BNO}-common-${quality}-hls`

        const stream_url_res = await fetch(
            proxy_url({ url: GET_STREAM_URL, query: { "return_type": cdn_val, "broad_key": broad_key } })
        )

        return stream_url_res
            .json()
            .then((data) => {
                return data.get("view_url") as string
            })
            .catch((err) => { throw new Error(`Error from Fetching: ${err}`) })
    }

    private async post_aid_key(info: LiveInfoResponse, quality: string, password: string) {
        const aid_key_res = await fetch(
            proxy_url({ url: LIVE_CHECK }), {
            method: "POST",
            headers: {
                "Origin": "https://live.sooplive.co.kr",
                "Referer": "https://live.sooplive.co.kr/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({ "type": "aid", "bno": info.BNO, "quality": quality, "pwd": password })
        })

        return aid_key_res
            .json()
            .then((data) => { return data.get("CHANNEL").get("AID") as string })
            .catch((err) => { throw new Error(`Error from Fetching: ${err}`) })
    }

    public async post_live_playlist(info: LiveInfoResponse, quality?: string, password?: string) {
        quality = quality || "master"
        password = password || ""

        const stream_url = await this.get_stream_url(info, quality).catch((err) => { throw new PlaylistError(err) });
        const aid_key = await this.post_aid_key(info, quality, password).catch((err) => { throw new AIDError(err) });

        return proxy_url({ url: stream_url, path: "stream", query: { "aid": aid_key } })
    }

    public async get_master_stream(info: LiveInfoResponse, password?: string): Promise<string> {
        password = password || ""

        let master_playlist = '#EXTM3U\n';
        try {
            let streams = []
            for (let preset of info.VIEWPRESET!) {
                if (preset.name == "auto") { continue }

                console.log("loading preset of: ", preset.name)
                streams.push(
                    new streamInfo(
                        await this.post_live_playlist(info, preset.name, password),
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
        this.liveInfo = undefined
    }

}