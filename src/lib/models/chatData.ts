export interface userFlag {
    ADMIN: boolean;
    HIDDEN: boolean;
    BJ: boolean;
    DUMB: boolean;
    GUEST: boolean;
    FANCLUB: boolean;
    AUTOMANAGER: boolean;
    MANAGERLIST: boolean;
    MANAGER: boolean;
    FEMALE: boolean;
    AUTODUMB: boolean;
    DUMB_BLIND: boolean;
    DOBAE_BLIND: boolean;
    EXITUSER: boolean;
    MOBILE: boolean;
    TOPFAN: boolean;
    REALNAME: boolean;
    NODIRECT: boolean;
    GLOBAL_APP: boolean;
    QUICKVIEW: boolean;
    SPTR_STICKER: boolean;
    CHROMECAST: boolean;
    DOBAE_BLIND2: boolean;
    FOLLOWER: boolean;
    NOTIVODBALOON: boolean;
    NOTITOPFAN: boolean;
}

export interface statusFlag {
    GLOBAL_PC: boolean;
    CLAN: boolean;
    TOPCLAN: boolean;
    TOP20: boolean;
    GAMEGOD: boolean;
    GAMEIMO: boolean;
    NOSUPERCHAT: boolean;
    NORECVCHAT: boolean;
    FLASH: boolean;
    LGGAME: boolean;
    EMPLOYEE: boolean;
    CLEANATI: boolean;
    POLICE: boolean;
    ADMINCHAT: boolean;
    PC: boolean;
    SPECIFY: boolean;
    NEW_STUDIO: boolean;
    HTML5: boolean;
}

export interface freezeFlag {
    streamer: boolean;
    fanclub: boolean;
    supporter: boolean;
    topfan: boolean;
    subscriber: boolean;
    manager: boolean;
}

export enum eventType {
    EMPTY = 'EMPTY',
    UNKNOW = 'UNKNOW',
    MESSAGE = 'MESSAGE',
    CHUSER_JOIN = 'CHUSER_JOIN',
    CHUSER_EXIT = "CHUSER_EXIT",
    DUMB = "DUMB",
    SET_MANAGER = "SET_MANAGER",
    BALLOON = "BALLOON",
    ICEMODE = "ICEMODE",
    SLOWMODE = "SLOWMODE",
    BAN_WORD = "BAN_WORD",
    KICK = "KICK",
    CLOSE = "CLOSE",
    DISPLAY_KICK = "DISPLAY_KICK",
    SEND_SUBSCIPTION = "SEND_SUBSCIPTION",
    FOLLOW = "FOLLOW",
    NOTICE = "NOTICE",
    OGQ = "OGQ",
    MISSION = "MISSION",
    MISSION_SETTLE = "MISSION_SETTLE",
}

export class eventData {
    idx: number;
    eventType: eventType;
    eventArgs: EventArgs;
    timestamp: number = Date.now();

    constructor(idx: number, eventType: eventType, eventArgs: EventArgs) {
        this.idx = idx;
        this.eventType = eventType;
        this.eventArgs = eventArgs;
    }
}

export interface EventArgs {
    toggleVal?: boolean;
    levelVal?: number;
    aux_levelVal?: number;
    thresholdVal?: number;
    message?: string;
    userid?: string;
    nickname?: string;
    sub_months?: number;
    user_flag?: userFlag;
    status_flag?: statusFlag;
    freeze_flag?: freezeFlag;
    OGQ_id?: string;
    OGQ_index?: number;
    OGQ_version?: number;
    OGQ_format?: string;
}
export interface chatRules {
    showBalloons: boolean;
    showKicks: boolean;
    showSubscriptions: boolean;
    showFollows: boolean;
    showMission: boolean;
    showMissionSettle: boolean;
}

