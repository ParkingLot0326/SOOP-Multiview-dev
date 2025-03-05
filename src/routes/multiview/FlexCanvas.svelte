<script lang="ts">
    import Live from "./Live.svelte";

    const MINWIDTH = 640;
    const THRESHOLDWIDTH = 880;
    const MINHEIGHT = 360;

    let canvas = document.getElementById("canvas");
    let chatWrapper: HTMLElement;
    let isChatOpen = false;
    let logicChatOpen = false;

    function closeChat() {
        isChatOpen = false;
        logicChatOpen = false;
    }

    function openChat() {
        isChatOpen = true;
        logicChatOpen = true;
    }

    let children = [];
    let idCounter = 1;

    children = [...children, { id: idCounter }];

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

<div class="flex-canvas" id="canvas">
    <div class="favorite-bar">fav</div>
    <div class="volume-control">vol</div>
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
        {#each children as child (child.id)}
            <Live {child} />
        {/each}
        <button class="close-button" on:click={openChat}>Open Chat</button>
    </live>

    <live class="live" id="sub1">
        <button class="close-button" on:click={openChat}>Open Chat</button>
        S1
    </live>

    <live class="live" id="sub2">
        <button class="close-button" on:click={openChat}>Open Chat</button>
        S2
    </live>

    <live class="live" id="sub3">
        <button class="close-button" on:click={openChat}>Open Chat</button>
        S3
    </live>

    <live class="live" id="sub4">
        <button class="close-button" on:click={openChat}>Open Chat</button>
        S4
    </live>

    <live class="live" id="sub5">
        <button class="close-button" on:click={openChat}>Open Chat</button>
        S5
    </live>

    <live class="live" id="sub6">
        <button class="close-button" on:click={openChat}>Open Chat</button>
        S6
    </live>

    <live class="live" id="sub7">
        <button class="close-button" on:click={openChat}>Open Chat</button>
        S7
    </live>
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
