<script lang="ts">
    import { window } from "@tauri-apps/api";
    import { PhysicalSize } from "@tauri-apps/api/dpi";
    import "@fortawesome/fontawesome-free/css/all.min.css";
    import Chat from "./Chat.svelte";
    import { ChatSocket } from "$lib";

    const sidebarWidth = 280;
    const viewportMinHeight = 580;
    const viewport = window.getCurrentWindow();

    let settingOpen = $state(false);
    let chatOpen = $state(false);

    let expander: HTMLElement | undefined = $state(undefined);
    let isExpanded = $state(false);
    let beforeWidth: number | null;

    let {
        doFixMainVol = $bindable(),
        doFixQuality = $bindable(),
        doShrinkDelay = $bindable(),
        doDelayChat = $bindable(),
        mainVol = $bindable(),
        mainChatSocket = $bindable(),
        liveWrap,
    }: {
        doFixMainVol: boolean;
        doFixQuality: boolean;
        doShrinkDelay: boolean;
        doDelayChat: boolean;
        mainVol: number;
        mainChatSocket: ChatSocket;
        liveWrap: HTMLElement;
    } = $props();

    async function expand() {
        let size = await viewport.innerSize();

        if (size.width <= 1008 + sidebarWidth) {
            beforeWidth = size.width;
            const targetWidth = size.width + sidebarWidth;
            // Set min size first so window can expand
            viewport.setMinSize(
                new PhysicalSize(targetWidth, viewportMinHeight),
            );
            isExpanded = true;
            viewport.setSize(new PhysicalSize(targetWidth, size.height));
        } else {
            beforeWidth = null;
            isExpanded = true;
        }
    }

    async function collapse() {
        const height = await viewport.innerSize().then((size) => size.height);
        const isMaximized = await viewport.isMaximized();

        if (beforeWidth && !isMaximized) {
            viewport.setMinSize(new PhysicalSize(1008, viewportMinHeight));
            liveWrap.style.maxWidth = "0";
            viewport.setSize(new PhysicalSize(beforeWidth, height)).then(() => {
                isExpanded = false;
            });
            liveWrap.style.maxWidth = "none";
        } else {
            isExpanded = false;
        }

        settingOpen = false;
        chatOpen = false;
    }

    function toggleChatOpen() {
        chatOpen = !chatOpen;
    }

    function toggleSettingOpen() {
        settingOpen = !settingOpen;
    }
</script>

<div
    class="sidebar-wrap"
    class:expanded={isExpanded}
    style:--sidebarWidth={sidebarWidth + 24 + "px"}
>
    <button
        class="expander"
        class:expanded={isExpanded}
        bind:this={expander}
        onclick={isExpanded ? collapse : expand}
        aria-label="expander"
        ><i class="fa-solid fa-chevron-right"></i>
    </button>
    <!-- svelte-ignore a11y_no_static_element_interactions -->

    <button
        class="setting menu-wrap"
        class:expanded={isExpanded}
        onclick={() => {
            if (!isExpanded) {
                expand();
            }
            toggleSettingOpen();
        }}
        aria-label="setting"
        ><i class="fa-solid fa-gear"></i>
        <div class="label" class:expanded={isExpanded}>설정</div>
    </button>
    <div
        class="content"
        style="max-height: 300px; align-items: start;"
        class:expanded={isExpanded}
        class:selected={settingOpen}
    >
        <div class="setting-wrap">
            <div class="setting-entry">
                <input
                    type="checkbox"
                    id="doFixMainVol"
                    bind:checked={doFixMainVol}
                />
                <label for="doFixMainVol">메인 볼륨 고정</label>
            </div>

            <div class="option-input-wrap" class:disabled={!doFixMainVol}>
                <input
                    disabled={!doFixMainVol}
                    class="slider"
                    bind:value={mainVol}
                    type="range"
                    name="volume"
                    max="100"
                    min="0"
                />
            </div>

            <div class="setting-entry">
                <input
                    type="checkbox"
                    id="doFixQuality"
                    name="doFixQuality"
                    bind:checked={doFixQuality}
                />
                <label for="doFixQuality">화질 고정</label>
            </div>
            <div class="option-input-wrap" class:disabled={!doFixQuality}>
                <select disabled={!doFixQuality}></select>
            </div>
            <div class="setting-entry">
                <input
                    type="checkbox"
                    id="doShrinkDelay"
                    bind:checked={doShrinkDelay}
                />
                <label for="doShrinkDelay">시차 단축</label>
            </div>

            <div class="layout-wrap">
                <button>레이아웃 1</button>
                <button>레이아웃 2</button>
                <button>레이아웃 3</button>
            </div>
        </div>
    </div>

    <button
        class="chat menu-wrap"
        class:expanded={isExpanded}
        onclick={() => {
            if (!isExpanded) {
                expand();
            }
            toggleChatOpen();
        }}
        aria-label="chat"
    >
        <i class="fa-regular fa-comment-dots"></i>
        <div class="label" class:expanded={isExpanded}>채팅</div>
    </button>

    <div class="content" class:expanded={isExpanded} class:selected={chatOpen}>
        <Chat
            onMessage={() => {}}
            onEvent={() => {}}
            disconnect={() => {}}
            handleSendMessage={() => {}}
            bind:socket={mainChatSocket}
        />
    </div>
</div>

<style>
    .sidebar-wrap {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: start;
        height: calc(100% - 18px);
        padding: 8px;
        padding-top: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    }
    .sidebar-wrap.expanded {
        width: var(--sidebarWidth);
    }

    .setting,
    .chat,
    .expander {
        margin: 0;
        padding: 0;
        text-justify: center;
        border: none;
        background-color: transparent;
        cursor: pointer;
    }

    .expander {
        width: 24px;
        height: 24px;
        font-size: 24px;
        margin-bottom: 5px;
        margin-top: 5px;
        transform: rotate(180deg);
        transition: transform 0.2s;
    }

    .expander.expanded {
        transform: rotate(0deg);
    }

    .menu-wrap {
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: row;
        align-items: center;

        overflow: hidden;
        font-size: 16pt;
        font-family: "Pretendard";
    }
    .menu-wrap.expanded {
        width: 100%;
        flex-grow: 0;
    }

    .menu-wrap > i {
        width: 24px;
        height: 24px;
        font-size: 24px;
        margin-bottom: 5px;
        margin-top: 5px;
    }

    .label {
        overflow: hidden;
        text-wrap: none;
        height: 0;
        width: 0;
        opacity: 0;
        transition-property: opacity, transform;
        transition-duration: 0.3s, 0.5s;
        transition-delay: 0.1s, 0.1s;
        transform: translateX(0);
    }
    .label.expanded {
        transform: translateX(10px);
        width: auto;
        height: auto;
        opacity: 1;
        padding-bottom: 2px;
    }

    .content {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-items: center;
        overflow: hidden;
        height: 0;
        width: 0;
        opacity: 1;
        transition-property: margin, flex-grow, padding;
        transition-duration: 0.1s, 0.3s, 0.3s;
        transition-timing-function: ease-in-out, ease-in-out, auto;
        border-radius: 24px;
        border: 1px solid gray;
        margin-top: 4px;
    }

    .content.expanded {
        width: auto;
        flex-grow: 0;
        width: 100%;
    }

    .content.selected {
        flex-grow: 1;
        opacity: 1;
        padding-bottom: 24px;
        transition-property: margin, flex-grow;
        transition-duration: 0.1s, 0.3s;
        transition-timing-function: ease-in, ease-in-out;
    }

    .setting-wrap {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: start;
        width: 100%;
        height: 100%;
        padding: 0 8px;
        padding-top: 24px;
        gap: 4px;
    }

    .splitter-hor {
        border: 1px solid rgb(0, 0, 0, 0.3);
        border-radius: 50%;
        width: 100%;
        margin: 4px;
    }

    .setting-entry {
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: 32px;
        margin: 0px 4px;
        font-size: 14pt;
        padding: 4px;
        border-radius: 8px;
        gap: 4px;
        transition: all 0.1s;
    }

    .setting-entry:hover {
        background-color: rgba(82, 82, 82, 0.13);
        font-size: 16pt;
    }

    .setting-entry > label {
        width: 100%;
    }

    .option-input-wrap {
        padding: 0px 8px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        width: 100%;
    }

    .option-input-wrap.disabled {
        height: 0;
    }

    .slider {
        width: 100%;
        height: 24px;
    }
</style>
