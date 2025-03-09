<script lang="ts">
    import Carousel from "./Carousel.svelte";
    import { LiveRequest } from "./live";
    import { itemInfo } from "./subStatus";

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
    let live: LiveRequest = new LiveRequest();

    export let popupIdx: number = 0;

    export let isPopupOpening: boolean = false;
    export let isPopupOpen: boolean = false;

    let items: itemInfo[] = [
        // new itemInfo("1", "테스트1"),
        // new itemInfo("1", "테스트1"),
    ];
    let selectedItem: itemInfo;
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
        overlay.style.display = "flex";
        popupIdx = idx;
        console.log(popupIdx);

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
            console.log("hide");
            hidePopup();
        }
    }

    function hidePopup() {
        clearError();
        popup.style.display = "none";
        overlay.style.display = "none";
        isPopupOpen = false;
    }

    function hideInputs() {
        inputWrap.style.display = "none";
        buttonWrap.style.display = "flex";
    }

    function showInputs() {
        inputWrap.style.display = "flex";
        buttonWrap.style.display = "none";
    }

    export let onSetStream: (idx: number, url: string, id: string) => void;

    async function register(info: string, regMode: number) {
        live.purge();
        let id = live.setup(info);
        try {
            let liveUrl = await live.get_master_stream();
            onSetStream(popupIdx, liveUrl, id);
        } catch (e) {
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
            default:
                break;
        }
        console.log(regMode);
    }

    function clearError() {
        errorURL = "";
        errorID = "";
    }
</script>

<div class="overlay" bind:this={overlay} style="display: none"></div>
<div class="popup" bind:this={popup} style="display: none">
    <div style=" position:relative; width:100%">
        <Carousel
            bind:selectedID={ImgSelectionID}
            bind:this={carousel}
            bind:items
        />
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
                    register(idInputVal, 1);
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
        pointer-events: all;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(0px);
        z-index: 1000;
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
