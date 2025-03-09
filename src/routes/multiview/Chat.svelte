<script lang="ts">
    import { onMount } from "svelte";
    import { ChatSocket } from "./chat";

    let chatSocket: ChatSocket | null = null;
    onMount(() => {
        // chatSocket = new ChatSocket("", "url");
        // chatSocket.initializeWebSocket();
    });

    function sendMessage() {
        // chatSocket?.sendMSG("Hello, world!");
        console.log(message);
    }

    let message = "";

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            if (!e.shiftKey) {
                e.preventDefault();
                sendMessage();
                message = "";
            }
        }
    }
</script>

<div class="wrapper">
    <div class="chat-list-wrapper">
        <div class="info-wrap">
            <div style="cursor:pointer">채팅</div>
            <div>btn1</div>
            <div>btn2</div>
            <div>btn3</div>
        </div>
        <div class="chat-list"></div>
    </div>
    <div class="chat-input">
        <textarea
            rows="1"
            on:keydown={handleKeydown}
            bind:value={message}
            contenteditable="true"
        ></textarea>
        <button class="submit-button" on:click={sendMessage}>Send</button>
    </div>
</div>

<style>
    .wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 200px;
        width: 100%;
        height: 100%;
        background-color: white;
        opacity: 1;
    }

    .chat-list-wrapper {
        display: flex;
        flex-grow: 6;
        pointer-events: none;
        width: 100%;
        background-color: lightgray;
    }

    .info-wrap {
        width: 100%;
        margin-right: 4px;
        margin-left: 4px;
        display: flex;
        justify-content: space-between;
        flex-direction: row;
    }

    .chat-input {
        width: calc(100% - 8px);
        display: flex;
        flex-shrink: 1;
        align-items: center;
        border-radius: 10px;
        margin: 4px;
        gap: 4px;
        border: 1px solid black;
    }

    textarea {
        flex-grow: 1;
        font-family: "Pretendard";
        font-size: 16px;
        padding-left: 8px;
        padding-top: 12px;
        padding-bottom: 12px;
        border-radius: 8px;
        pointer-events: all;
        text-align: start;
        resize: none;
    }

    .submit-button {
        position: relative;
        margin-right: 14px;
    }
</style>
