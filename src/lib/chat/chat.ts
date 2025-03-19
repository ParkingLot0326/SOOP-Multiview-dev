
import { eventData, eventType } from '$lib';
import type { chatRules, freezeFlag, LiveInfoResponse, statusFlag, userFlag } from '$lib';

const BK: string = String.fromCharCode(9)
const FF: string = String.fromCharCode(12)
const ESC: string = String.fromCharCode(27)

export class ChatSocket {
    public onMessage?: () => void;
    public onFlush: () => void;
    public onConnect: () => void;

    public savedChatThreshold: number = 50;
    public chatRules: chatRules = {
        showBalloons: true,
        showKicks: true,
        showSubscriptions: true,
        showFollows: true,
        showMission: true,
        showMissionSettle: true,
    };
    public chatItems: eventData[] = [];

    private websocket: WebSocket | undefined;
    private PingPacket: string = `${ESC}${BK}000000000100${FF}`

    private decoder = new TextDecoder("utf-8")
    private encoder = new TextEncoder()

    private keepAlive: NodeJS.Timeout | undefined;
    private pruner: NodeJS.Timeout | undefined;

    private globalIndex: number = 0;

    public id: string = "";

    constructor(
        onFlush: () => void,
        onConnection: () => void,
        savedChatThreshold: number = 100,
        chatRules?: chatRules,
        onMessage?: () => void,
    ) {
        this.onFlush = onFlush
        this.onConnect = onConnection
        this.savedChatThreshold = savedChatThreshold
        if (onMessage) this.onMessage = onMessage
        if (chatRules) this.chatRules = chatRules
    }

    public async initializeWebSocket(info: LiveInfoResponse, cookie: string): Promise<boolean> {
        console.log("Initializing Chat WebSocket...")

        this.id = info.BJID

        if (info.CHATNO == undefined || info.CHDOMAIN == undefined || info.CHPT == undefined) {
            console.log("Chat Not Available: LiveInfo Successfully Fetched, but not containing essential data.")
            console.debug("LiveInfo was: ", info)
            return false
        }

        let ws = new WebSocket(`wss://${info.CHDOMAIN}:${Number(info.CHPT) + 1}/Websocket/${info.BJID}`, ["chat"]);
        this.websocket = ws
        ws.onmessage = async (e) => {
            let text = "";
            if (e.data instanceof ArrayBuffer) {
                text = this.decoder.decode(e.data)
            } else if (e.data instanceof Blob) {
                const buffer = await e.data.arrayBuffer()
                text = this.decoder.decode(buffer)
            } else if (typeof e.data === "string") {
                text = e.data
            } else {
                throw new Error("Unknown data type")
            }

            const textarr = text.split(FF)
            text = text.replaceAll(FF, " FF ")
            let event: eventData | undefined = undefined;

            switch (text.substring(2, 6)) {
                case "0001":
                    console.log("INIT")
                    ws.send(this.makeJoinPacket(info.CHATNO!.toString()))
                    break;
                case "0002":
                    console.log("JOIN")

                    this.keepAlive = setInterval(() => {
                        ws.send(this.PingPacket)
                    }, 30000)
                    this.pruner = setInterval(() => { this.prune_old_chat }, 1000)

                    this.onConnect()
                    break;
                case "0004": {
                    console.log("CHUSER")
                    const isJoin = textarr[1] == "1"
                    const [userflag, statusflag] = this.parse_user_flag(textarr[2])

                    event = new eventData(
                        this.globalIndex,
                        isJoin ? eventType.CHUSER_JOIN : eventType.CHUSER_EXIT,
                        {
                            userid: textarr[2],
                            nickname: textarr[3],
                            user_flag: userflag,
                            status_flag: statusflag,
                        }
                    )
                    break;
                }
                case "0005": {
                    const [userflag, statusflag] = this.parse_user_flag(textarr[2])

                    event = new eventData(
                        this.globalIndex,
                        eventType.MESSAGE,
                        {
                            message: textarr[1],
                            nickname: textarr[6],
                            user_flag: userflag,
                            status_flag: statusflag,
                            sub_months: Number(textarr[8]),
                        }
                    )
                    break;
                }
                case "0008": {
                    console.log("DUMB") // 채금, 3회누적시 블라
                    const [userflag, statusflag] = this.parse_user_flag(textarr[2])

                    event = new eventData(
                        this.globalIndex,
                        eventType.DUMB,
                        {
                            userid: textarr[1],
                            user_flag: userflag,
                            status_flag: statusflag,
                            levelVal: Number(textarr[4]), // 채금 레벨
                            aux_levelVal: Number(textarr[3]), //채금 시간
                        }
                    )
                    break;
                }
                case "0012":
                    console.log("SET_USERFLAG")
                    break;
                case "0013": {
                    console.log("MANAGER_TOGGLE") //매니저 설정
                    const userid = textarr[1]
                    const [userflag, statusflag] = this.parse_user_flag(textarr[2])

                    event = new eventData(
                        this.globalIndex,
                        eventType.SET_MANAGER,
                        {
                            userid: userid,
                            user_flag: userflag,
                            status_flag: statusflag,
                        }
                    )
                    break;
                }
                case "0018":
                    console.log("SEND_BALLOON")
                    console.log(text)
                    break;
                case "0019":
                    break;
                case "0021": {
                    console.log("ICEMODE_EXT") // 챗 얼리기 확장
                    const doFreeze = textarr[1] == "1"
                    const freeze_flag = this.parse_freezeFlag(textarr[3])

                    event = new eventData(
                        this.globalIndex,
                        eventType.ICEMODE,
                        {
                            toggleVal: doFreeze, // 얼리기 토글
                            freeze_flag: freeze_flag, // 얼리기 플래그
                            levelVal: Number(textarr[2]), // 얼리기 레벨
                            thresholdVal: Number(textarr[4]), // 팬클럽 별풍제한
                        }
                    )
                    break;
                }
                case "0023": {
                    console.log("SET_SLOWMODE")
                    event = new eventData(
                        this.globalIndex,
                        eventType.SLOWMODE,
                        {
                            levelVal: Number(textarr[2]), // 챗 간격
                        }
                    )
                    break;
                }
                case "0026":
                    console.log("MANAGER_CHAT") // 매니저챗
                    break;
                case "0052":
                    console.log("BLACKLIST") // 블랙리스트
                    break;
                case "0054":
                    console.log("BAN_WORD") // 금칙어? 클라에서 못 거른거 또는 대체단어 미설정시?
                    console.log(text)
                    break;
                case "0076": {
                    console.log("KICK") // 강퇴

                    event = new eventData(
                        this.globalIndex,
                        eventType.KICK,
                        {
                            userid: textarr[1],
                            nickname: textarr[2],
                        }
                    )
                    break;
                }
                case "0088":
                    console.log("CLOSE_BROAD") //방종
                    ws.close()
                    break;
                case "0090": {
                    console.log("DISPLAY_KICK") // 강퇴메세지 표시여부 세팅
                    const doDisplayKickMsg = textarr[2] == "1"

                    event = new eventData(
                        this.globalIndex,
                        eventType.DISPLAY_KICK,
                        {
                            toggleVal: doDisplayKickMsg,
                        }
                    )
                    break;
                }
                case "0094":
                    console.log("TRANSLATION_STATE") // 채팅 번역 서비스 상태
                    break;
                case "0104": {
                    console.log("BJNOTICE") // 스머 공지
                    const notice_msg = textarr[4]

                    event = new eventData(
                        this.globalIndex,
                        eventType.NOTICE,
                        {
                            message: notice_msg,
                        }
                    )
                    break;
                }
                case "0108":
                    console.log("SENDSUBSCRIPTION") // 구독 선물
                    console.log(text)
                    break;
                case "0093": {
                    console.log("FOLLOW_ITEM") // 구독
                    const bjid = textarr[1]

                    event = new eventData(
                        this.globalIndex,
                        eventType.FOLLOW,
                        {
                            userid: textarr[2],
                            nickname: textarr[3],
                            sub_months: Number(textarr[4]),
                        }
                    )
                    break;
                }
                case "0109": {
                    console.log("OGQ_EMOTICON") // OGQ 이모티콘
                    const [userflag, statusflag] = this.parse_user_flag(textarr[8])

                    event = new eventData(
                        this.globalIndex,
                        eventType.OGQ,
                        {
                            OGQ_id: textarr[3], //id
                            OGQ_index: Number(textarr[4]), //index
                            OGQ_version: Number(textarr[5]), //version
                            OGQ_format: textarr[9], //format
                            userid: textarr[6],
                            nickname: textarr[7],
                            user_flag: userflag,
                            status_flag: statusflag,
                        }
                    )
                    break;
                }
                case "0111":
                    console.log("ITEM_DROPS")
                    console.log(text)
                    break;
                case "0121":
                    console.log("MISSION")
                    console.log(text)
                    break;
                case "0125":
                    console.log("MISSION_SETTLE")
                    console.log(text)
                    break;
                case "0127":
                    break;
                default:
                    console.warn("Unknown Packet: ", text.substring(2, 6))
                    console.warn("Unknown Message: ", text)
                    break;

            }
            if (event) this.handle_new_event(event)
        }

        ws.onopen = (e) => {
            console.log("Chat Socket Open")
            ws.send(this.makeInitPacket(cookie))
        }

        ws.onerror = (e) => {
            console.error("Chat Socket Error")
            console.error(e)
            if (this.keepAlive) clearInterval(this.keepAlive)
            if (this.pruner) clearInterval(this.pruner)
            this.websocket = undefined
            this.onFlush()
        }

        ws.onclose = (e) => {
            console.log("Chat Socket Closed: ", e)
            if (this.keepAlive) clearInterval(this.keepAlive)
            if (this.pruner) clearInterval(this.pruner)
            this.websocket = undefined
            this.onFlush()
        }

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

    public close() {
        if (this.websocket?.readyState == 0 || this.websocket?.readyState == 1) { this.websocket.close() }
    }

    private prune_old_chat() {
        if (this.chatItems.length > this.savedChatThreshold) {
            this.chatItems = this.chatItems.slice(this.chatItems.length - this.savedChatThreshold)
        }
    }

    private handle_new_event(event: eventData) {
        this.globalIndex++;

        if (!Number.isSafeInteger(this.globalIndex)) {
            this.globalIndex = 0;
        }

        let doRecord: boolean = false;
        switch (event.eventType) {
            case eventType.DISPLAY_KICK: {
                this.chatRules.showKicks = event.eventArgs?.toggleVal || false;
                break;
            }
            case eventType.CHUSER_JOIN:
            case eventType.CHUSER_EXIT:
            case eventType.SET_MANAGER:
                break;
            case eventType.KICK: {
                if (this.chatRules.showKicks) { doRecord = true; }
                break;
            }
            case eventType.FOLLOW: {
                if (this.chatRules.showSubscriptions) { doRecord = true; }
                break;
            }
            case eventType.DUMB:
            case eventType.ICEMODE:
            case eventType.SLOWMODE:
            case eventType.NOTICE:
            case eventType.MESSAGE:
            case eventType.OGQ: {
                doRecord = true;
                break;
            }
        }

        if (doRecord) {
            this.chatItems = [...this.chatItems, event];
        }

    }

    private parse_user_flag(flag: string): [userFlag, statusFlag] {
        let flags = flag.split("|")
        return [this.parse_flag1(flags[0]), this.parse_flag2(flags[1])]
    }

    private parse_flag1(flag: string): userFlag {
        flag = Number(flag).toString(2).padStart(32, '0').split('').reverse().join('')

        let flags: userFlag = {
            "ADMIN": flag[0] == "1",
            "HIDDEN": flag[1] == "1",
            "BJ": flag[2] == "1",
            "DUMB": flag[3] == "1",
            "GUEST": flag[4] == "1",
            "FANCLUB": flag[5] == "1",
            "AUTOMANAGER": flag[6] == "1",
            "MANAGERLIST": flag[7] == "1",
            "MANAGER": flag[8] == "1",
            "FEMALE": flag[9] == "1",
            "AUTODUMB": flag[10] == "1",
            "DUMB_BLIND": flag[11] == "1",
            "DOBAE_BLIND": flag[12] == "1",
            "EXITUSER": flag[13] == "1",
            "MOBILE": flag[14] == "1",
            "TOPFAN": flag[15] == "1",
            "REALNAME": flag[16] == "1",
            "NODIRECT": flag[17] == "1",
            "GLOBAL_APP": flag[18] == "1",
            "QUICKVIEW": flag[19] == "1",
            "SPTR_STICKER": flag[20] == "1",
            "CHROMECAST": flag[21] == "1",
            "DOBAE_BLIND2": flag[24] == "1",
            "FOLLOWER": flag[28] == "1",
            "NOTIVODBALOON": flag[30] == "1",
            "NOTITOPFAN": flag[31] == "1",
        }

        return flags
    }

    private parse_flag2(flag: string): statusFlag {
        flag = Number(flag).toString(2).padStart(32, '0').split('').reverse().join('')

        let flags: statusFlag = {
            "GLOBAL_PC": flag[0] == "1",
            "CLAN": flag[1] == "1",
            "TOPCLAN": flag[2] == "1",
            "TOP20": flag[3] == "1",
            "GAMEGOD": flag[4] == "1",
            "GAMEIMO": flag[5] == "1",
            "NOSUPERCHAT": flag[6] == "1",
            "NORECVCHAT": flag[7] == "1",
            "FLASH": flag[8] == "1",
            "LGGAME": flag[9] == "1",
            "EMPLOYEE": flag[10] == "1",
            "CLEANATI": flag[11] == "1",
            "POLICE": flag[12] == "1",
            "ADMINCHAT": flag[13] == "1",
            "PC": flag[14] == "1",
            "SPECIFY": flag[15] == "1",
            "NEW_STUDIO": flag[16] == "1",
            "HTML5": flag[17] == "1",
        }

        return flags

    }

    private parse_freezeFlag(flag: string): freezeFlag {
        flag = Number(flag).toString(2).padStart(16, '0').split('').reverse().join('')

        let flags: freezeFlag = {
            "streamer": flag[4] == "1",
            "fanclub": flag[5] == "1",
            "supporter": flag[6] == "1",
            "topfan": flag[7] == "1",
            "subscriber": flag[8] == "1",
            "manager": flag[9] == "1",
        }

        return flags
    }

    private makeInitPacket = (cookie?: string) => {
        let packet = [];
        packet.push(ESC + BK + "0001")
        if (cookie) {
            packet.push((this.encoder.encode(cookie).length + 6).toString().padStart(6, '0') + "00")
        } else {
            packet.push("00000600")
        }

        packet.push(FF)
        if (cookie) {
            packet.push(cookie)
        }
        packet.push(FF + FF + "16" + FF)

        return packet.join('')
    }

    private makeJoinPacket = (chatno: string) => {
        let packet = [];
        packet.push(ESC + BK + "0002")
        packet.push((this.encoder.encode(chatno).length + 6).toString().padStart(6, '0') + "00")
        packet.push(FF + chatno + FF + FF + FF + FF + FF)

        return packet.join('')
    }
}

