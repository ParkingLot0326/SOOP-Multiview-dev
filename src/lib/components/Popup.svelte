<script lang="ts">
    import {
        carouselItemInfo,
        proxy_url,
        Carousel,
        type LiveInfoResponse,
    } from "$lib";

    const LIVE_CHECK =
        "https://live.sooplive.co.kr/afreeca/player_live_api.php";

    let overlay: HTMLElement;
    let popup: HTMLElement;
    let carousel: Carousel;
    let inputWrap: HTMLElement;
    let buttonWrap: HTMLElement;

    let ImgSelectionID: string | undefined;

    let urlInputVal: string = "";
    let errorURL: string = "";
    let idInputVal: string = "";
    let errorID: string = "";

    let overlayShown = false;

    export let popupIdx: number = 0;

    export let isPopupOpening: boolean = false;
    export let isPopupOpen: boolean = false;

    export let registeredStreams: string[];
    export let onSetStream: (idx: number, info: LiveInfoResponse) => void;

    let items: carouselItemInfo[] = [];
    let selectedItem: carouselItemInfo;
    $: {
        selectedItem = items.filter((val) => {
            return val.id == ImgSelectionID;
        })[0];
    }

    export function showPopup(idx: number) {
        if (isPopupOpen) {
            return;
        }
        // 팝업을 열 때 플래그 설정
        isPopupOpening = true;
        isPopupOpen = true;
        popup.style.display = "flex";
        overlayShown = true;
        popupIdx = idx;

        // 다음 틱에서 플래그 해제 (비동기적으로 실행)
        setTimeout(() => {
            isPopupOpening = false;
        }, 100);
    }

    export function handleClick(e: MouseEvent) {
        if (!popup) {
            return;
        }
        // 팝업이 방금 열렸거나, 클릭된 요소가 팝업 내부인 경우 무시
        if (isPopupOpening || popup.contains(e.target as Node)) {
            return;
        }

        if (popup.style.display == "flex") {
            hidePopup();
        }
    }

    function hidePopup() {
        clearError();
        popup.style.display = "none";
        isPopupOpen = false;
        overlayShown = false;
        urlInputVal = "";
        idInputVal = "";
        ImgSelectionID = undefined;
    }

    function setup(input: string): string {
        if (
            input.includes("play.sooplive.co.kr") ||
            input.includes("live.sooplive.co.kr")
        ) {
            return input
                .replaceAll("https://", "http://")
                .replaceAll("http://", "")
                .split("/")[1];
        } else if (input.split(" ").length == 1) {
            return input;
        } else {
            throw new Error("Invalid URL or BJID");
        }
    }

    async function fetchInfo(bjid: string) {
        const live_info_res = await fetch(proxy_url({ url: LIVE_CHECK }), {
            method: "POST",
            headers: {
                Origin: "https://live.sooplive.co.kr",
                Referer: "https://live.sooplive.co.kr/",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            body: JSON.stringify({
                bid: bjid,
            }),
        });

        return live_info_res
            .json()
            .then((data) => {
                let live_info = data["CHANNEL"] as LiveInfoResponse;
                live_info.BJID = bjid;
                return live_info;
            })
            .catch((err) => {
                throw new Error(`Error from Fetching: ${err}`);
            });
    }

    async function register(dat: string, regMode: number) {
        let bid = setup(dat);

        if (registeredStreams.includes(bid)) {
            showError(regMode + 3);
            return;
        }
        try {
            onSetStream(popupIdx, await fetchInfo(bid));
        } catch (e) {
            console.error(e);
            showError(regMode);
            return;
        }
        hidePopup();
        urlInputVal = "";
        idInputVal = "";
    }

    function showError(regMode: number) {
        clearError();
        switch (regMode) {
            case 0:
                errorURL = "방송을 불러올 수 없습니다. ";
                break;
            case 1:
                errorID = "ID가 잘못되었습니다.";
                break;
            case 3:
                errorURL = "이미 등록된 방송을 중복 등록할 수 없습니다";
                break;
            case 4:
                errorID = "이미 등록된 방송을 중복 등록할 수 없습니다.";
                break;
            default:
                break;
        }
    }

    function clearError() {
        errorURL = "";
        errorID = "";
    }

    function removeSpcChar(str: string) {
        return str.replace(/[^a-zA-Z0-9]/g, "");
    }
</script>

<div class:overlay class:overlay-blur={overlayShown} bind:this={overlay}></div>
<div class="popup" bind:this={popup} style="display: none">
    <div style=" position:relative; width:100%">
        <Carousel bind:selectedID={ImgSelectionID} bind:this={carousel} />
    </div>

    <div
        class="input-wrap"
        style={ImgSelectionID != undefined ? "display:none" : "display:flex"}
        bind:this={inputWrap}
    >
        <div class="label">방송 URL로 재생하기</div>
        <div class="input-form">
            <input
                type="text"
                placeholder="방송 URL을 입력해주세요..."
                disabled={ImgSelectionID != undefined}
                bind:value={urlInputVal}
            />
            <button
                on:click={() => {
                    register(urlInputVal, 0);
                }}>확인</button
            >
        </div>
        <div class="error">{errorURL}</div>
        <div class="label">스트리머 ID로 재생하기</div>
        <div class="input-form">
            <input
                type="text"
                placeholder="스트리머 ID를 입력해주세요.."
                disabled={ImgSelectionID != undefined}
                bind:value={idInputVal}
            /><button
                on:click={() => {
                    register(removeSpcChar(idInputVal), 1);
                }}>확인</button
            >
        </div>
        <div class="error">{errorID}</div>
    </div>

    <div
        class="confirm-wrap"
        style={ImgSelectionID != undefined ? "display:flex" : "display:none"}
        bind:this={buttonWrap}
    >
        <div>
            {selectedItem ? selectedItem.nick : ""}님의 방송을 추가하시겠습니까?
        </div>
        <div class="button-wrap">
            <button
                on:click={() => {
                    register(ImgSelectionID!, 2);
                }}>추가</button
            >
            <button
                on:click={() => {
                    hidePopup();
                }}>취소</button
            >
        </div>
    </div>

    <input style="display: none" bind:value={popupIdx} />
</div>

<style>
    .overlay {
        pointer-events: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        transition: all 0.15s;
    }

    .overlay-blur {
        pointer-events: all;
        backdrop-filter: blur(4px);
        background-color: rgba(255, 255, 255, 0.15);
    }

    .popup {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        width: 480px;
        height: 320px;

        backdrop-filter: blur(30px);
        background-color: #d3d3d3dc;

        border-radius: 16px;
        /* border: 3px solid rgba(0, 0, 0, 0.541); */

        z-index: 1000;

        display: flex;
        flex-direction: column;
        justify-content: start;
        align-items: center;
        gap: 0;

        transition: all 0.3s;
    }

    .input-wrap {
        flex-grow: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: start;
        gap: 4px;
    }

    .label {
        margin-left: 18px;
    }

    .input-form {
        width: inherit;
        display: flex;
        gap: 10px;
    }

    .input-form > input {
        flex-grow: 1;
        margin-left: 18px;
    }

    .input-form > button {
        width: 60px;
        margin-right: 18px;
    }

    .confirm-wrap {
        flex-grow: 2;
        display: flex;
        flex-direction: column;
        justify-content: start;
        align-items: center;
        gap: 20px;
        padding-top: 20px;
    }

    .error {
        color: red;
        margin-left: 18px;
        font-size: 12px;
    }

    .button-wrap {
        display: flex;
        gap: 10px;
    }
</style>
