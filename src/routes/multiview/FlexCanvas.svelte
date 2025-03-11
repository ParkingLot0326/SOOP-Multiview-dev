<script lang="ts">
    import { onMount } from "svelte";
    import Live from "./Live.svelte";
    import Carousel from "./Carousel.svelte";
    import Popup from "./Popup.svelte";
    import ChatBubble from "../chat/ChatBubble.svelte";
    import type { ChatData } from "../chat/chatData";

    import { v4 as uuidv4 } from "uuid";

    const MINWIDTH = 640;
    const THRESHOLDWIDTH = 880;
    const MINHEIGHT = 360;

    const uuid = uuidv4().replaceAll("-", "");
    const guid = uuidv4().replaceAll("-", "").toUpperCase();

    console.log(guid);

    let canvas: HTMLElement;
    let popup: Popup;
    let chatWrapper: HTMLElement;
    let isChatOpen = false;
    let logicChatOpen = false;

    let cur_main_index = 0;

    let liveRefs: Map<number, (url: string, bjid: string) => Promise<void>> =
        new Map();
    liveRefs.clear();

    function registerLiveCallback(
        id: number,
        component: (url: string) => Promise<void>,
    ) {
        liveRefs.set(id, component);
        console.log(liveRefs);
    }

    let indexes = [
        { id: 0 },
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
        { id: 6 },
        { id: 7 },
    ];

    let registeredStreams: string[] = [];

    function closeChat() {
        isChatOpen = false;
        chatWrapper.style.display = "none";
        logicChatOpen = false;
    }

    function openChat() {
        isChatOpen = true;
        chatWrapper.style.display = "flex";
        logicChatOpen = true;
    }

    function showPopup(idx: number) {
        popup.showPopup(idx);
    }

    function hidePopup(e: MouseEvent) {
        popup.handleClick(e);
    }

    function onSetStream(idx: number, url: string, bjid: string) {
        let func = liveRefs.get(idx);
        func!(url, bjid);
        registeredStreams.push(bjid);
    }

    function onMoveClick(idx: number) {
        swap(cur_main_index, idx);
        cur_main_index = idx;
        console.log("swap!");
        console.log("swap idx: ", idx);
        console.log(indexes);
    }

    function onFlush(bjid: string) {
        if (registeredStreams.includes(bjid)) {
            registeredStreams = registeredStreams.filter((val) => {
                return val != bjid;
            });
        }
    }

    function swap(i: number, j: number) {
        // 배열의 두 요소를 구조 분해 할당으로 스왑합니다.
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
        // Svelte가 변경을 감지할 수 있도록 배열 전체를 새 배열로 재할당합니다.
        indexes = [...indexes];
        console.log("indexes: ", indexes);
    }

    onresize = () => {
        console.log(window.innerWidth);
        if (window.innerWidth <= THRESHOLDWIDTH) {
            isChatOpen = false;
            chatWrapper.style.display = "none";
            console.log("chat closed");
        } else {
            if (logicChatOpen == true) {
                isChatOpen = true;
                chatWrapper.style.display = "flex";
                console.log("chat Opened");
            }
        }
    };

    let popupIdx: number = 0;

    onMount(() => {
        window.addEventListener("click", hidePopup);

        // 컴포넌트가 제거될 때 이벤트 리스너 정리
        return () => {
            window.removeEventListener("click", hidePopup);
        };
    });
</script>

<div class="flex-canvas" bind:this={canvas}>
    <Popup
        bind:popupIdx
        bind:this={popup}
        bind:registeredStreams
        {onSetStream}
    />

    <div class="favorite-bar">기능 추가 예정입니다...</div>
    <div class="volume-control"></div>
    <div class="chat-wrapper" bind:this={chatWrapper} style="display: none">
        <button class="close-button" on:click={closeChat}>X</button>
        <div class="chat-control">ChatCon</div>
        <div class="chat-area">
            <div class="chat-display">ChatDispl</div>
            <div class="chat-input" style:display="none">ChatIn</div>
        </div>
    </div>
    {#each indexes as index, i}
        <live class="live-{index.id}">
            <Live
                {uuid}
                {guid}
                idx={i}
                onPopUp={showPopup}
                {onFlush}
                {onMoveClick}
                register={registerLiveCallback}
            />
            <!-- <button class="close-button" on:click={openChat}>Open Chat</button> -->
        </live>
    {/each}
</div>

<style>
    .flex-canvas {
        position: relative;
        display: grid;
        height: 100vh;
        width: 100vw;

        grid-template-columns: repeat(4, minmax(240px, 1fr)) auto;
        grid-template-rows: 70px repeat(4, minmax(135px, 1fr));
    }

    .flex-canvas > * {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .favorite-bar {
        grid-column: 1 / span 3;
        grid-row: 1;
        background-color: #f0f0f0;
    }

    .volume-control {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 10px;
        flex-direction: column;
        grid-column: 4 / span 1;
        grid-row: 1;
        background-color: #f0f0f0;
    }

    .chat-wrapper {
        display: flex;
        position: relative;
        flex-direction: column;
        grid-column: 5 / span 1;
        grid-row: 1 / span 5;
        background-color: #f0f0f0;
        min-width: 240px;
    }

    .close-button {
        position: absolute;
        right: 10px;
        top: 10px;
    }

    .chat-control {
        border: 1px solid black;
        width: 100%;
        flex-grow: 1;
    }

    .chat-area {
        border: 1px solid black;
        width: 100%;
        flex-grow: 3;
    }

    live {
        position: relative;
    }

    .live-0 {
        grid-column: 1 / span 3;
        grid-row: 2 / span 3;
    }

    .live-1 {
        grid-column: 4;
        grid-row: 2;
    }

    .live-2 {
        grid-column: 4;
        grid-row: 3;
    }

    .live-3 {
        grid-column: 4;
        grid-row: 4;
    }

    .live-4 {
        grid-column: 1;
        grid-row: 5;
    }

    .live-5 {
        grid-column: 2;
        grid-row: 5;
    }
    .live-6 {
        grid-column: 3;
        grid-row: 5;
    }

    .live-7 {
        grid-column: 4;
        grid-row: 5;
    }
</style>
