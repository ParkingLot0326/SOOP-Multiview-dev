export interface LiveInfoResponse {
    RESULT: number;
    BJID: string;
    VIEWPRESET?: ViewPreset[];
    BNO?: number;
    BJNICK?: string;
    CHATNO?: number;
    BPWD?: string;
    TITLE?: string;
    BPS?: string;
    RESOLUTION?: string;
    CATE?: string;
    CATEGORY_TAGS?: string[];
    HASH_TAGS?: string[];
    CDN?: string;
    CHIP?: string;
    CHPT?: string;
    CHDOMAIN?: string;
    PCON_OBJECT?: {
        "tier1"?: PCon[];
        "tier2"?: PCon[];
    };
    CTIP?: string;
    CTPT?: string;
    GWIP?: string;
    GWPT?: string;
    FTK?: String;
}
interface ViewPreset {
    label: string;
    label_resolution: number;
    name: string;
    bps: number;
}
interface PCon {
    MONTHS: string;
    FILENAME: string;
}

