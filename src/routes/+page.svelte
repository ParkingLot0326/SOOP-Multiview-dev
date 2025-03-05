<script lang="ts">
  import FlexCanvas from "./multiview/FlexCanvas.svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let activeTabValue = 1;

  const appWindow = getCurrentWindow();

  function handleHotKey(e: KeyboardEvent) {}
</script>

<div style="display: flex; flex-direction: column; height: 100%;">
  <div data-tauri-drag-region class="titlebar">
    <div class="window-title">
      <img
        src="/tauri.svg"
        alt="icon"
        style="color: black;width: 20px; height: 20px; margin-right: 5px;"
      />
      MultiDownloader
    </div>
    <div style="display:flex; justify-content: flex-end;">
      <button
        class="titlebar-button"
        id="titlebar-minimize"
        on:click={appWindow.minimize}
      >
        <img
          src="https://api.iconify.design/mdi:window-minimize.svg"
          alt="minimize"
        />
      </button>
      <button
        class="titlebar-button"
        id="titlebar-maximize"
        on:click={appWindow.toggleMaximize}
      >
        <img
          src="https://api.iconify.design/mdi:window-maximize.svg"
          alt="maximize"
        />
      </button>
      <button
        class="titlebar-button"
        id="titlebar-close"
        on:click={appWindow.close}
      >
        <img src="https://api.iconify.design/mdi:close.svg" alt="close" />
      </button>
    </div>
  </div>

  <div style="display: flex; flex-direction: column; height: 100%;">
    <FlexCanvas />
  </div>
</div>

<svelte:window on:keydown={handleHotKey} />

<style>
  :root {
    font-family: "Pretendard";
  }

  :root::-webkit-scrollbar {
    display: none;
  }

  button {
    border: none;
  }
  .titlebar {
    height: 30px;
    background: rgba(0, 0, 0, 0.1);
    user-select: none;
    display: flex;
    justify-content: space-between;
    position: relative;
    top: 0;
    left: 0;
    right: 0;
  }

  .window-title {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    padding: 0 10px;
    font-size: 16px;
    font-family: "Pretendard";
    font-weight: normal;
    color: #000;
  }

  .titlebar-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 30px;
    height: 30px;
    user-select: none;
    -webkit-user-select: none;
  }
  .titlebar-button:hover {
    background: #5bbec3;
  }
</style>
