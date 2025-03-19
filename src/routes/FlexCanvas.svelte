<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        type LiveInfoResponse,
        Popup,
        Live,
        Sidebar,
        ChatSocket,
    } from "$lib";
    import { v4 as uuidv4 } from "uuid";

    const MINWIDTH = 640;
    const THRESHOLDWIDTH = 880;
    const MINHEIGHT = 360;

    const uuid = uuidv4().replaceAll("-", "");
    const guid = uuidv4().replaceAll("-", "").toUpperCase();

    let canvas: HTMLElement;
    let popup: Popup;
    let liveWrapper: HTMLElement | undefined = $state(undefined);
    let mainChatSocket: ChatSocket | undefined = $state(undefined);

    let doFixMainVol = $state(false);
    let doFixQuality = $state(false);
    let doShrinkDelay = $state(false);
    let doDelayChat = $state(false);
    let delay = $state(2000);

    let cur_main_index = $state(0);

    let indexes = $state([0, 1, 2, 3, 4, 5, 6, 7]);
    let liveRefs: Map<number, (info: LiveInfoResponse) => Promise<void>> =
        new Map();
    let liveComponents = $state<Record<number, any>>({});

    let registeredStreams: string[] = $state([]);
    let popupIdx: number = $state(0);

    function update_socket() {
        const mainComponent = liveComponents[cur_main_index];

        if (
            mainComponent &&
            typeof mainComponent.getChatSocket === "function"
        ) {
            try {
                const chatSocket = mainComponent.getChatSocket();
                mainChatSocket = chatSocket;
                console.log("메인 채팅 소켓이 업데이트되었습니다.");
            } catch (error) {
                console.error(
                    "채팅 소켓을 가져오는 중 오류가 발생했습니다:",
                    error,
                );
            }
        } else {
            console.warn(
                "메인 컴포넌트가 없거나 getChatSocket 메서드가 없습니다.",
            );
        }
    }

    function register(
        id: number,
        component: (info: LiveInfoResponse) => Promise<void>,
    ) {
        liveRefs.set(id, component);
    }

    function showPopup(idx: number) {
        popup.showPopup(idx);
    }

    function hidePopup(e: MouseEvent) {
        popup.handleClick(e);
    }

    function onSetStream(idx: number, info: LiveInfoResponse) {
        let func = liveRefs.get(idx);
        registeredStreams.push(info.BJID!);
        func!(info);
    }

    function onMoveClick(idx: number) {
        swap(cur_main_index, idx);
        cur_main_index = idx;
        update_socket();
        console.log("swaped Main with idx: ", idx);
    }

    function onFlush(bjid: string) {
        if (registeredStreams.includes(bjid)) {
            registeredStreams = registeredStreams.filter((val) => {
                return val != bjid;
            });
        }
        console.log(registeredStreams);
    }

    function onConnect() {
        console.log("connect");
        update_socket();
    }

    function swap(i: number, j: number) {
        if (i == j) return;
        // 배열의 두 요소를 구조 분해 할당으로 스왑합니다.
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
        // Svelte가 변경을 감지할 수 있도록 배열 전체를 새 배열로 재할당합니다.
        indexes = [...indexes];
    }

    onMount(() => {
        window.addEventListener("click", hidePopup);

        const preventContextMenu = (event: Event) => {
            event.preventDefault();
        };

        document.addEventListener("contextmenu", preventContextMenu);

        // 컴포넌트가 제거될 때 이벤트 리스너 정리
        return () => {
            window.removeEventListener("click", hidePopup);
            document.removeEventListener("contextmenu", preventContextMenu);
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

    <div class="sidebar n"></div>
    <div class="sidebar s"></div>
    <div class="sidebar w"></div>
    <div class="sidebar e">
        <Sidebar
            liveWrap={liveWrapper!}
            bind:doFixMainVol
            bind:doFixQuality
            bind:doShrinkDelay
            bind:doDelayChat
            {mainChatSocket}
            {delay}
        />
    </div>
    <div class="live-wrapper" bind:this={liveWrapper}>
        {#each indexes as index, i}
            <live class="live-{index}">
                <Live
                    bind:this={liveComponents[i]}
                    idx={i}
                    {uuid}
                    {guid}
                    {onFlush}
                    {onMoveClick}
                    {onConnect}
                    {showPopup}
                    {register}
                />
                <!-- <button class="close-button" on:click={openChat}>Open Chat</button> -->
            </live>
        {/each}
    </div>
</div>

<style>
    .flex-canvas {
        position: absolute;
        display: grid;
        height: 100%;
        width: 100%;

        grid-template-columns: auto minmax(960px, 1fr) auto;
        grid-template-rows: auto minmax(500px, 1fr) auto;
    }

    .flex-canvas > * {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .live-wrapper {
        display: grid;
        grid-row: 2;
        grid-column: 2;
        grid-template-columns: repeat(4, minmax(220px, 1fr));
        grid-template-rows: repeat(4, minmax(115px, 1fr));
        gap: 4px;
        padding: 4px;
        min-width: 960px;
        background-color: rgb(156, 156, 156);
    }
    .live-wrapper > * {
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
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
        grid-column: 3 / span 1;
        grid-row: 1 / span 3;
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
        grid-row: 1 / span 3;
    }

    .live-1 {
        grid-column: 4;
        grid-row: 1;
    }

    .live-2 {
        grid-column: 4;
        grid-row: 2;
    }

    .live-3 {
        grid-column: 4;
        grid-row: 3;
    }

    .live-4 {
        grid-column: 1;
        grid-row: 4;
    }

    .live-5 {
        grid-column: 2;
        grid-row: 4;
    }
    .live-6 {
        grid-column: 3;
        grid-row: 4;
    }

    .live-7 {
        grid-column: 4;
        grid-row: 4;
    }
    .sidebar {
        background-color: white;
    }

    .sidebar.n {
        grid-column: 1 / -1;
        grid-row: 1;
    }
    .sidebar.s {
        grid-column: 1 / -1;
        grid-row: -2;
    }
    .sidebar.e {
        grid-column: -2;
        grid-row: 1 / -1;
    }
    .sidebar.w {
        grid-column: 1;
        grid-row: 1 / -1;
    }
</style>
