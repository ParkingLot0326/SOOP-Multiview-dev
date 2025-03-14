<script lang="ts">
    import { window } from "@tauri-apps/api";
    import { PhysicalSize } from "@tauri-apps/api/dpi";
    import "@fortawesome/fontawesome-free/css/all.min.css";
    import FlexCanvas from "./FlexCanvas.svelte";
    import { onMount } from "svelte";

    const sidebarWidth = 280;
    const viewportMinHeight = 610;

    let settingOpen = false;
    let chatOpen = false;

    let expander;
    let isExpanded = false;
    let viewport = window.getCurrentWindow();
    let beforeWidth: number | null;

    export let doFixMainVol: boolean;
    export let doFixQuality: boolean;
    export let doShrinkDelay: boolean;

    export let MainVol: number;

    export let liveWrap: HTMLElement;

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
        console.log(isMaximized);

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
        on:click={isExpanded ? collapse : expand}
        aria-label="expander"
        ><i class="fa-solid fa-chevron-right"></i>
    </button>
    <!-- svelte-ignore a11y_no_static_element_interactions -->

    <button
        class="setting menu-wrap"
        class:expanded={isExpanded}
        on:click={() => {
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
                    bind:value={MainVol}
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
        on:click={() => {
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
        <div class="chat-display-wrap">
            <div class="chat-display"></div>
        </div>
        <div class="chat-input-wrap">
            <div class="entry-wrap">
                <div class="entry" contenteditable></div>
            </div>
            <button class="submit" aria-label="submit"
                ><i class="fa-solid fa-paper-plane"></i></button
            >
        </div>
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
