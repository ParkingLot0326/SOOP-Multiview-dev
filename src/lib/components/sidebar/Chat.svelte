<script lang="ts">
    import { onMount } from "svelte";
    import { ChatSocket, eventType, type eventData } from "$lib";

    import { ChatBubble, EventBubble } from "./bubble";

    let {
        handleSendMessage,
        disconnect,
        socket,
        delay,
    }: {
        handleSendMessage: () => void;
        disconnect: () => void;
        socket: ChatSocket;
        delay: number;
    } = $props();

    let chatItems: eventData[] = $state([]);
    let updateTimer: NodeJS.Timeout | undefined = undefined;

    let chatDisplay: HTMLElement;
    let shouldAutoScroll = true;
    let lastScrollTop = 0;
    let lastScrollHeight = 0;

    onMount(() => {
        updateTimer = setInterval(() => {
            chatItems = socket ? socket.chatItems : [];
            if (socket) console.log(socket.id);
        }, 150);
        socket;

        return () => {
            clearInterval(updateTimer);
        };
    });

    $effect(() => {
        const items = $state.snapshot(chatItems);
        if (items.length > 0) {
            scrollToBottom();
        }
    });

    function scrollToBottom() {
        // 다음 틱에 스크롤 이동 (DOM 업데이트 후)
        setTimeout(() => {
            if (shouldAutoScroll && chatDisplay) {
                // 현재 스크롤 위치 저장
                lastScrollHeight = chatDisplay.scrollHeight;
                lastScrollTop = chatDisplay.scrollTop;

                // 스크롤을 맨 아래로 이동
                chatDisplay.scrollTop = chatDisplay.scrollHeight;
            }
        }, 0);
    }

    function handleScroll() {
        // 스크롤바가 거의 맨 아래에 있는지 확인
        const isAtBottom =
            chatDisplay.scrollHeight -
                chatDisplay.scrollTop -
                chatDisplay.clientHeight <
            50;

        // 사용자가 위로 스크롤한 경우 자동 스크롤 비활성화
        if (!isAtBottom) {
            shouldAutoScroll = false;
        }

        // 사용자가 맨 아래로 스크롤한 경우 자동 스크롤 재활성화
        if (
            chatDisplay.scrollTop + chatDisplay.clientHeight >=
            chatDisplay.scrollHeight - 10
        ) {
            shouldAutoScroll = true;
        }

        // 현재 스크롤 위치 저장
        lastScrollTop = chatDisplay.scrollTop;
    }

    function buildPconSrc() {
        return "";
    }

    function buildBadgeSrc() {
        return ["", ""];
    }
</script>

<div class="chat-display-wrap">
    <div class="chat-display" bind:this={chatDisplay} onscroll={handleScroll}>
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
        margin-left: 6px;
        margin-right: 6px;
        padding: 0px 12px;
        border-radius: 12px;
        box-sizing: border-box;
    }

    .entry-wrap {
        flex: 0 1 auto;
        position: relative;
        width: 100%;
        margin: 10px 0px;
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
