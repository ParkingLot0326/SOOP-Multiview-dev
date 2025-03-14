import { fetch } from "@tauri-apps/plugin-http";

const LOGIN: string = "https://login.sooplive.co.kr/app/LoginAction.php";
const LOGOUT: string = "https://login.sooplive.co.kr/app/Logout.php";

enum LoginStatus {
    SUCCESS = 0,
    TFA = 1,
    FAILED = 2
}

export class AuthManager {
    private static instance: AuthManager;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    public async login(id: string, pw: string, doRetain: boolean): Promise<LoginStatus> {
        let loginBody: object = {
            "szWork": "login",
            "szType": "json",
            "szUid": id,
            "szPassword": pw,
            "szScriptVar": "oLoginRet",
            "isLoginRetain": doRetain
        };

        let res = await fetch(LOGIN, {
            method: "POST",
            body: JSON.stringify(loginBody),
            headers: {
                "Content-Type": "application/json",
                "Origin": "https://play.sooplive.co.kr",
                "Referer": "https://play.sooplive.co.kr/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Encoding": "deflate, br",
                "Connection": "keep-alive"
            }
        })
        if (res.status == 200) {
            switch (await res.text()) {
                case "1":
                    return LoginStatus.SUCCESS;
                case "-11":
                    return LoginStatus.TFA;
                default:
                    return LoginStatus.FAILED;
            }
        } else {
            throw new Error("Error on login");
        }
    };

    public async loginTFA(id: string, tfa: string, doRetain: boolean): Promise<LoginStatus> {
        let res = await fetch(LOGIN, {
            method: "POST",
            body: JSON.stringify({
                "szWork": "second_login",
                "szType": "text",
                "szUid": id,
                "szPassword": tfa,
                "szScriptVar": "oLoginRet",
                "isLoginRetain": doRetain,
            }),
            headers: {
                "Content-Type": "application/json",
                "Origin": "https://play.sooplive.co.kr",
                "Referer": "https://play.sooplive.co.kr/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            }
        })

        if (res.status == 200) {
            switch (await res.text()) {
                case "1":
                    return LoginStatus.SUCCESS;
                default:
                    return LoginStatus.FAILED;
            }
        } else {
            throw new Error("Error on TFA");
        }
    }

    public async logout(): Promise<void> {
        let res = await fetch(LOGOUT, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Origin": "https://play.sooplive.co.kr",
                "Referer": "https://play.sooplive.co.kr/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            }
        })

        if (res.headers.getSetCookie().length == 0) {
            throw new Error("Logout failed");
        }
    }
}