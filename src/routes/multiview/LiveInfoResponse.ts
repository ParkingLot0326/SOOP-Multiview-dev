export interface LiveInfoResponse {
    RESULT: number;
    VIEWPRESET?: ViewPreset[];
    BJID?: string;
    BNO?: number;
    BJNICK?: string;
    CHATNO?: number;
    BPWD?: string;
    TITLE?: string;
    BPS?: string;
    RESOLUTION?: string;
    CATEGORY_TAGS?: string[];
    HASH_TAGS?: string[];
    CDN?: string;
    CHPT?: string;
    CHDOMAIN?: string;
    PCON_OBJECT?: {
        "tier1"?: PCon[];
        "tier2"?: PCon[];
    };
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

