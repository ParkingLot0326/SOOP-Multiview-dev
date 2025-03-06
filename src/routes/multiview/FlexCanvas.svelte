<script lang="ts">
    import Live from "./Live.svelte";

    const MINWIDTH = 640;
    const THRESHOLDWIDTH = 880;
    const MINHEIGHT = 360;

    let canvas: HTMLElement;
    let chatWrapper: HTMLElement;
    let isChatOpen = false;
    let logicChatOpen = false;

    let main_volume: number = 0.5;
    let sub_volume: number = 0.5;

    function closeChat() {
        isChatOpen = false;
        logicChatOpen = false;
    }

    function openChat() {
        isChatOpen = true;
        logicChatOpen = true;
    }

    onresize = () => {
        if (window.innerWidth < 880) {
            isChatOpen = false;
        } else {
            if (logicChatOpen == true) {
                isChatOpen = true;
            }
        }
    };
</script>

<div class="flex-canvas" bind:this={canvas}>
    <div class="favorite-bar">fav</div>
    <div class="volume-control">
        <div>메인 볼륨</div>
        <input
            type="range"
            min="0"
            max="1"
            class="slider"
            id="main-volume"
            bind:value={main_volume}
        />
        <div>서브 볼륨</div>
        <input
            type="range"
            min="0"
            max="1"
            class="slider"
            id="sub-volume"
            bind:value={sub_volume}
        />
    </div>
    <div class="chat-wrapper" bind:this={chatWrapper}>
        <button class="close-button" on:click={closeChat}>X</button>
        <div class="chat-control">ChatCon</div>
        <div class="chat-area">
            <div class="chat-display">ChatDispl</div>
            <div
                class="chat-input"
                style:display={isChatOpen ? "flex" : "none"}
            >
                ChatIn
            </div>
        </div>
    </div>
    <live class="live" id="main">
        <Live bind:volume={main_volume} />
        <button class="close-button" on:click={openChat}>Open Chat</button>
    </live>
    {#each Array(7) as _, i}
        <live class="live" id={`sub${i + 1}`}>
            <button class="close-button" on:click={openChat}>Open Chat</button>
            <Live bind:volume={sub_volume} />
        </live>
    {/each}
</div>

<style>
    .flex-canvas {
        display: grid;
        height: 100%;
        width: 100%;

        grid-template-columns: repeat(4, minmax(160px, 1fr)) auto;
        grid-template-rows: 100px repeat(4, minmax(90px, 1fr));
    }

    .flex-canvas > * {
        display: flex;
        justify-content: center;
        align-items: center;
        border: 1px solid black;
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

    .volume-control div:nth-child(1) {
        grid-column: 1;
        grid-row: 1;
    }

    .volume-control div:nth-child(2) {
        grid-column: 2;
        grid-row: 1;
    }

    .volume-control div:nth-child(3) {
        grid-column: 1;
        grid-row: 2;
    }

    .volume-control div:nth-child(4) {
        grid-column: 2;
        grid-row: 2;
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

    live:nth-of-type(1) {
        grid-column: 1 / span 3;
        grid-row: 2 / span 3;
    }

    live:nth-of-type(2) {
        grid-column: 4;
        grid-row: 2;
    }

    live:nth-of-type(3) {
        grid-column: 4;
        grid-row: 3;
    }

    live:nth-of-type(4) {
        grid-column: 4;
        grid-row: 4;
    }

    live:nth-of-type(5) {
        grid-column: 1;
        grid-row: 5;
    }

    live:nth-of-type(6) {
        grid-column: 2;
        grid-row: 5;
    }
    live:nth-of-type(7) {
        grid-column: 3;
        grid-row: 5;
    }

    live:nth-of-type(8) {
        grid-column: 4;
        grid-row: 5;
    }
</style>
