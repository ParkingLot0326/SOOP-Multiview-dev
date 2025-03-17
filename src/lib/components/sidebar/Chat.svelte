<script lang="ts">
    import { onMount } from "svelte";
    import { ChatSocket, eventType, type eventData } from "$lib";

    import { ChatBubble, EventBubble } from "./bubble";

    let {
        onMessage,
        onEvent,
        handleSendMessage,
        disconnect,
        socket = $bindable(),
    }: {
        onMessage: () => void;
        onEvent: () => void;
        handleSendMessage: () => void;
        disconnect: () => void;
        socket: ChatSocket;
    } = $props();

    onMessage = () => {
        console.log("message received");
    };

    onEvent = () => {
        console.log("event received");
    };

    let chatItems: eventData[] = $derived(socket.displayItems);

    function buildPconSrc() {
        return "";
    }

    function buildBadgeSrc() {
        return ["", ""];
    }
</script>

<div class="chat-display-wrap">
    <div class="chat-display">
        {#each chatItems as item}
            {#if item.eventType == eventType.MESSAGE}
                <ChatBubble
                    data={{
                        nickname: item.eventArgs.nickname!,
                        subscribe_months: item.eventArgs.sub_months!,
                        subscribe_tier: item.eventArgs.levelVal || 0,
                        message: item.eventArgs.message!,
                        timestamp: item.timestamp.toString(),
                        pcon_src: buildPconSrc(),
                        badge_src: buildBadgeSrc()[0],
                        badge_name: buildBadgeSrc()[1],
                    }}
                />
            {/if}
            <EventBubble />
        {/each}
    </div>
</div>
<div class="chat-input-wrap">
    <div class="entry-wrap">
        <div class="entry" contenteditable></div>
    </div>
    <button class="submit" aria-label="submit">
        <i class="fa-solid fa-paper-plane"></i>
    </button>
</div>

<style>
    .chat-display-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    .chat-display {
        flex: 0 1 auto;
        overflow-y: scroll;
        padding-bottom: 4px;
        border: 1px solid black;
        width: 100%;
        height: 100%;
    }
    .chat-display::-webkit-scrollbar {
        display: none;
    }

    .chat-input-wrap {
        display: flex;
        align-items: center;
        position: relative;
        background: #f6f6f9;
        width: 100%;
        height: 50px;
        margin-top: 6px;
        padding: 0px 12px;
        border-radius: 12px;
        box-sizing: border-box;
    }

    .entry-wrap {
        flex: 0 1 auto;
        position: relative;
        width: 100%;
        height: 100%;
    }

    .entry {
        position: absolute;
        top: 50%;
        left: 0;
        overflow: hidden scroll;
        background: rgba(0, 0, 0, 0);
        width: 100%;
        max-height: 100%;
        padding: 5px 0;
        box-sizing: border-box;
        font-size: 14px;
        line-height: 1.4;
        color: #17191c;
        border: none;
        word-wrap: break-word;
        cursor: text;
        transform: translate(0, -50%);
        z-index: 1;
        scrollbar-width: none;
    }

    .entry:focus {
        outline: none;
    }

    .submit {
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        margin-left: 8px;
        border-radius: 8px;
        background-color: transparent;
        border: none;
    }

    .submit:focus {
        outline: none;
    }

    .submit:hover {
        background-color: rgba(145, 150, 161, 0.1);
    }

    .submit > i {
        font-size: 16px;
        color: gray;
        transform: rotate(-0deg);
    }
</style>
