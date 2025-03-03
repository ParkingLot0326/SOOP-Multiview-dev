<script lang="ts">
    import Chat from "./Chat.svelte";
    import Blank from "./Blank.svelte";
    import Live from "./Live.svelte";

    let canDrag = true;

    let currentComponent = Blank;
    let pinButton: HTMLElement;

    function switchToLive() {
        currentComponent = Live;
        show_utilMenu();
    }

    function register_live() {}

    function switchToChat() {
        currentComponent = Chat;
        show_utilMenu();
    }

    function switchToBlank() {
        currentComponent = Blank;
        show_slotTypeMenu();
        togglePinned(false);
    }

    function show_slotTypeMenu() {
        let slotTypeMenu: HTMLElement | null =
            document.querySelector(".button-wrap");

        if (slotTypeMenu) {
            slotTypeMenu.style.display = "block";
        }

        let utilMenu: HTMLElement | null =
            document.querySelector(".util-button-wrap");

        if (utilMenu) {
            utilMenu.style.display = "none";
        }
    }

    function show_utilMenu() {
        let slotTypeMenu: HTMLElement | null =
            document.querySelector(".button-wrap");

        if (slotTypeMenu) {
            slotTypeMenu.style.display = "none";
        }

        let utilMenu: HTMLElement | null =
            document.querySelector(".util-button-wrap");

        if (utilMenu) {
            utilMenu.style.display = "flex";
        }
    }

    function togglePinned(pin?: boolean | undefined) {
        if (pin == undefined) {
            canDrag = !canDrag;
        } else {
            canDrag = !pin;
        }
        if (canDrag) {
            pinButton.innerText = "pin";
        } else {
            pinButton.innerText = "unpin";
        }
    }
</script>

<div class="content-wrap">
    <div class="util-button-wrap">
        <button
            class="edit-button"
            style="display: none"
            on:click={switchToBlank}
            >edit
        </button>
        <button class="edit-button" style="display:none">refresh</button>
        <button
            class="edit-button"
            style="display:none"
            bind:this={pinButton}
            on:click={() => togglePinned()}>pin</button
        >
    </div>

    <div class="content">
        <svelte:component this={currentComponent} />
    </div>

    <div class="button-wrap">
        <button class="menu" on:click={switchToLive}> 방송 </button>
        <button class="menu" on:click={switchToChat}> 채팅 </button>
    </div>
</div>

<style>
    :root {
        --handle-hover-area-size: 10px;
        font-family: "Pretendard";
    }

    button {
        pointer-events: all;
        cursor: pointer;
    }

    .menu {
        pointer-events: all;
        padding: 8px 16px;
        width: 100px;
        z-index: 10;
        background-color: white;
        border-radius: 6px;
        opacity: 1;
        cursor: pointer;
        font-family: "Pretendard";
        font-size: 14pt;
    }

    .content-wrap {
        height: 100%;
        width: 100%;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        z-index: 0;
    }

    .content {
        pointer-events: all;
        background-color: #f0f0f0;
        border: 1px solid #e0e0e0;
        width: 100%;
        height: 100%;
        border-radius: 4px;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
        flex: 1;
        z-index: 0;
    }

    /* .content:hover {
        background-color: black;
        opacity: 0.25;
        z-index: 0;
    } */

    .util-button-wrap {
        pointer-events: all;
        display: flex;
        justify-content: space-between;
        background-color: black;
        margin-bottom: 4px;
        padding-top: 4px;
        padding-bottom: 4px;
        cursor: move;
        align-items: center;
        z-index: 1000;
        width: 100%;
    }

    .edit-button {
    }

    .button-wrap {
        pointer-events: all;
        cursor: default;
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: 4px;
        justify-content: center;
        align-items: center;
        background-color: black;
    }
</style>
