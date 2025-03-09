import type { LiveInfoResponse } from './LiveInfoResponse';
import { invoke } from '@tauri-apps/api/core';

const FF: string = String.fromCharCode(12)
const ESC: string = String.fromCharCode(27)

export class ChatSocket {
    private bid: string;
    private bno: string;
    private websocket: WebSocket | null = null;
    private PingPacket: string = `${ESC}000000000100${FF}`
    private COOKIE: string;

    constructor(private cookie: string, private url: string) {
        [this.bid, this.bno] = this.parse_url(url)
        this.COOKIE = cookie
    }

    private makeInitPacket = (cookie: string) => {
        return `${ESC}0001${(cookie.length + 6).toString().padStart(6, '0')}00${FF}${cookie}${FF}${FF}16${FF}`
    }

    private makeJoinPacket = (chatno: string) => {
        return `${ESC}0002${(chatno.length + 6).toString().padStart(6, '0')}00${FF}${chatno}${FF}${FF}${FF}${FF}${FF}`
    }

    private parse_url = (url: string) => {
        let tempArr = url.split("/")

        return [tempArr[0], tempArr[1].split("?")[0]]
    }

    private async post_live_info(): Promise<LiveInfoResponse> {
        try {
            return await invoke<object>(
                "check_live",
                { bid: this.bid }).catch((error) => { console.error(error) }) as LiveInfoResponse;
        } catch (err) {
            throw new Error(`Error from Rust: ${err}`)
        }
    }

    private validate_info(info: LiveInfoResponse): boolean {
        return info.CHATNO == undefined || info.CHDOMAIN == undefined || info.CHPT == undefined ? false : true
    }

    public async initializeWebSocket(): Promise<boolean> {
        const info = await this.post_live_info();

        if (info.CHATNO == undefined || info.CHDOMAIN == undefined || info.CHPT == undefined) {
            console.log("Chat Not Available: LiveInfo Successfully Fetched, but not containing essential data.")
            console.debug("LiveInfo was: ", info)
            return false
        }

        this.websocket = new WebSocket(`wss://${info.CHDOMAIN}:${info.CHPT}/Websocket/${this.bid}`, ["chat"]);

        this.websocket.onmessage = (event) => {
            const data = event.data
            const msgArr = data.split(FF)
            switch (msgArr[1].substring(0, 4)) {
                case "0001":
                    console.log("INIT")
                    break;
                case "0002":
                    console.log("JOIN")
                    break;
                case "0005":
                    console.log(data)
                    break;
            }
        }

        this.websocket.send(this.makeInitPacket(this.COOKIE))
        this.websocket.send(this.makeJoinPacket(info.CHATNO.toString()))

        setInterval(() => {
            this.websocket!.send(this.PingPacket)
        }, 30000)

        return true
    }

    public async sendMSG(message: string) {
        if (this.websocket && this.websocket.readyState == WebSocket.OPEN) {
            this.websocket.send(
                `${ESC}0005${(message.length + 4).toString().padStart(6, '0')}00${FF}${message}${FF}`
            );
        } else {
            throw new Error("WebSocket is not open.")
        }
    }
}