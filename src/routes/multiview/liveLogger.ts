import type { LiveInfoResponse } from './liveInfoResponse';
import { invoke } from '@tauri-apps/api/core';

const DC1 = "\u0011"
const DC2 = "\u0012"
const ACK = "\u0006"

enum SVCType {
    INIT_GW = "INIT_GW",
    INIT_BROAD = "INIT_BROAD",
    FLASH_LOGIN = "FLASH_LOGIN",
    CERTTICKETEX = "CERTTICKETEX",
    KEEPALIVE = "KEEPALIVE",
    GETUSERCNT = "GETUSERCNT",
    GETUSERCNTEX = "GETUSERCNTEX",
    JOINCH_COMMON = "JOINCH_COMMON",
    GETCHINFOEX = "GETCHINFOEX",
    GETBJADCON = "GETBJADCON",
    GETITEM_SELL = "GETITEM_SELL",
}

interface Packet<T> {
    SVC: SVCType;
    RESULT: number;
    DATA: T;
}

class Packet<T> {
    SVC: SVCType;
    RESULT: number;
    DATA: T;

    constructor(SVC: SVCType, RESULT: number, DATA: T) {
        this.SVC = SVC
        this.RESULT = RESULT
        this.DATA = DATA
    }
}


class GateWayPacketData {
    gate_ip: string;
    gate_port: number;
    broadno: number;
    category: string;
    cookie: string;
    cli_type: number = 41;
    cc_cli_type: number = 19;
    guid: string;
    BJID: string;
    fanticket?: string;
    QUALITY?: string;
    addinfo?: string;
    update_info?: number;

    constructor(
        gate_ip: string,
        gate_port: number,
        broadno: number,
        category: string,
        cookie: string,
        guid: string,
        BJID: string,
        fanticket?: string,
        QUALITY?: string,
        addinfo?: string,
        update_info?: number
    ) {
        this.gate_ip = gate_ip
        this.gate_port = gate_port
        this.broadno = broadno
        this.category = category
        this.cookie = cookie
        this.guid = guid
        this.BJID = BJID

        this.fanticket = fanticket
        this.QUALITY = QUALITY
        this.addinfo = addinfo
        this.update_info = update_info
    }
}

class BroadPaketData {
    center_ip: string;
    center_port: number;
    passwd: string;
    JOINLOG: string;
    cli_type: number = 41;
    cc_cli_type: number = 19;
    guid: string;
    gw_ticket: string;
    append_data: string;

    constructor(
        center_ip: string,
        center_port: number,
        passwd: string,
        JOINLOG: string,
        guid: string,
        gw_ticket: string,
        append_data: string
    ) {
        this.center_ip = center_ip
        this.center_port = center_port
        this.passwd = passwd
        this.JOINLOG = JOINLOG
        this.guid = guid
        this.gw_ticket = gw_ticket
        this.append_data = append_data
    }
}

interface CertTicketPacketData {
    pcTicket: string;
    pcAppendDat: string;
}

interface UserCountPacketData {
    uiBroadNo: number,
    uiJoinChMBUser: number,
    uiJoinChPCUser: number,
    uiMainChMBUser: number,
    uiMainChPCUser: number,
    uiMainMBHitUser: number,
    uiMainPCHitUser: number,
    uiParentBroadNo: number,
    uiSubChMBUser: number,
    uiSubChPCUser: number,
    uiSubMBHitUser: number,
    uiSubPCHitUser: number,
    uiTotClone: number,
}



export class LiveLogger {

    private bid?: string;
    private uuid: string;
    private guid: string;

    private ws?: WebSocket;
    private timeout?: NodeJS.Timeout;

    public userCnt: number = 0;

    constructor(uuid: string, guid: string) {
        this.uuid = uuid
        this.guid = guid.toUpperCase()
    }

    private async post_live_info(): Promise<LiveInfoResponse> {
        try {
            return await invoke<object>(
                "check_live",
                { bid: this.bid }) as LiveInfoResponse;
        }
        catch (err) {
            throw new Error(`Error from Rust: ${err}`)
        }
    }

    public async initializeWebSocket(bid: string): Promise<WebSocket | undefined> {
        this.bid = bid
        let info = await this.post_live_info();
        console.log("LiveInfo Fetched: ", info)
        console.log(bid)

        if (info == undefined || info.GWIP == undefined || info.GWPT == undefined || info.CTIP == undefined || info.CTPT == undefined) {
            console.log("Chat Not Available: LiveInfo Successfully Fetched, but not containing essential data.")
            console.debug("LiveInfo was: ", info)
            return
        }

        if (this.ws != null) {
            this.ws.close()
            this.ws = undefined
        }

        let ws = new WebSocket("wss://bridge.sooplive.co.kr/Websocket/" + this.bid, ["bridge"]);
        this.ws = ws

        ws.onopen = () => {
            console.log("Connected to Bridge")
            let packet = this.build_GW_packet(info)
            console.log("Sending Packet: ", JSON.stringify(packet))
            ws.send(JSON.stringify(packet))
        }

        ws.onmessage = (ev: MessageEvent<string>) => {
            let packet = JSON.parse(ev.data) as Packet<any>

            console.log("Message Received")
            switch (packet.SVC) {
                case SVCType.FLASH_LOGIN:
                    {
                        console.log("Initial Handshake completed")
                        break
                    }
                case SVCType.CERTTICKETEX: {
                    console.log("CertTicket Issued")
                    let data = packet.DATA as CertTicketPacketData
                    let ticket = data.pcTicket, appdata = data.pcAppendDat
                    ws.send(
                        JSON.stringify(
                            this.build_Broad_packet(info, ticket, appdata)
                        )
                    )

                    setTimeout(() => {
                        this.timeout = setInterval(() => {
                            ws.send(JSON.stringify(this.build_KA_packet()))
                        }, 20000), 20000
                    })
                    break
                }
                case SVCType.GETUSERCNTEX:
                case SVCType.GETUSERCNT:
                    {
                        console.log("User Count Changed")
                        let data = packet.DATA as UserCountPacketData
                        this.userCnt = data.uiJoinChMBUser + data.uiJoinChPCUser
                        break
                    }
                default: {
                    console.log("Unrecognized Packet: ", packet)
                    console.log("Packet SVCType: ", packet.SVC)
                    break
                }

            }
        }

        ws.onerror = (ev: Event) => {
            console.error("Error Occurred From LiveLogSocket: ", ev)
            let bid = this.bid
            if (ws.readyState == ws.OPEN) ws.close()
            this.ws = undefined

            setTimeout(() => { this.initializeWebSocket(bid!) }, 1000)
        }

        ws.onclose = (ev: CloseEvent) => {
            console.log("LiveLogSocket Closed: ", ev)
            if (this.timeout) clearInterval(this.timeout!)
            this.userCnt = 0
            this.ws = undefined
            this.bid = undefined
        }
    }

    public close() {
        if (this.ws) this.ws.close()
    }

    private build_KA_packet(): Packet<{}> {
        return new Packet(
            SVCType.KEEPALIVE,
            0,
            {}
        )
    }

    private build_GW_packet(info: LiveInfoResponse): Packet<GateWayPacketData> {
        return new Packet(
            SVCType.INIT_GW,
            0,
            new GateWayPacketData(
                info.GWIP!,
                Number(info.GWPT!),
                Number(info.BNO!),
                info.CATE!.toString(),
                "",
                this.guid.toUpperCase(),
                info.BJID!,
            )
        )
    }

    private build_Broad_packet(info: LiveInfoResponse, ticket: string, appdata: string): Packet<BroadPaketData> {
        let joinlog = this.build_user_log()

        return new Packet(
            SVCType.INIT_BROAD,
            0,
            new BroadPaketData(
                info.CTIP!,
                Number(info.CTPT!),
                info.BPWD!,
                joinlog,
                this.guid.toUpperCase(),
                ticket,
                appdata,
            ))
    }

    private build_user_log(sub?: number): string {
        sub = sub || -1

        let raw1: Object = {
            "uuid": this.uuid,
            "geo_cc": "KR",
            "geo_rc": "41",
            "acpt_lang": "ko_KR",
            "svc_lang": "ko_KR",
            "os": "win",
            "is_streamer": "false",
            "is_rejoin": "false",
            "is_auto": "false",
            "is_support_adaptive": "true",
            "uuid_3rd": this.uuid,
            "subscribe": sub,
            "player_mode": "landing",
        }

        let raw2 = {
            "is_clearmode": "false",
            "lowlatency": "0",
            "is_streamer": "false",
        }

        let log = ["log"]
        log.push(`${DC1}${ACK}&`)
        for (let [key, value] of Object.entries(raw1)) {
            log.push(`${ACK}${key}${ACK}=${ACK}${value}${ACK}`)
        }

        log.push(`${DC2}liveualog${DC1}${ACK}&`)
        for (let [key, value] of Object.entries(raw2)) {
            log.push(`${ACK}${key}${ACK}=${ACK}${value}${ACK}`)
        }
        log.push(DC2)

        return log.join()
    }
}