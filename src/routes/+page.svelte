<script lang="ts">
  import Video from "./clip/Video.svelte";
  import Dashboard from "./dashboard/Dashboard.svelte";
  import Login from "./login/Login.svelte";
  import Multiview from "./multiview/Canvas.svelte";
  import Remux from "./remux/Remux.svelte";
  import Settings from "./setting/Settings.svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let items = [
    { label: "대쉬보드", value: 1, component: Dashboard },
    { label: "REMUX", value: 2, component: Remux },
    { label: "VOD", value: 3, component: Video },
    { label: "클립", value: 4, component: Video },
    { label: "설정", value: 5, component: Settings },
    { label: "멀티뷰", value: 6, component: Multiview },
  ];
  let activeTabValue = 1;

  const appWindow = getCurrentWindow();

  function setActiveTabValue(value: number) {
    activeTabValue = value;
  }

  function handleHotKey(e: KeyboardEvent) {
    if (items.map((e) => String(e.value)).includes(e.key)) {
      setActiveTabValue(parseInt(e.key));
      console.log("tab " + e.key + " pressed");
    }
  }
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
    <ul>
      {#each items as item}
        <li class={activeTabValue === item.value ? "active" : ""}>
          <span
            on:click={() => setActiveTabValue(item.value)}
            role="button"
            tabindex="0"
            on:keydown={() => {}}
          >
            {item.label}
          </span>
        </li>
      {/each}
    </ul>
    <!-- <div
        on:click={() => (location.href = "/login")}
        role="button"
        tabindex="0"
        on:keydown={() => {}}
        class="profile-avatar"
      >
        로그인
      </div> -->
    <div style="height:100%;width:100% padding: 8px; background-color: #eeeeee">
      {#each items as item}
        {#if activeTabValue == item.value}
          <svelte:component this={item.component} />
        {/if}
      {/each}
    </div>
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
  ul {
    display: flex;
    flex-wrap: wrap;
    padding-left: 0;
    padding-bottom: 0px;
    padding-top: 6px;
    border-bottom: 1px solid #495057;
    margin: 0;
    list-style: none;
  }

  span {
    background-color: #d9d9d9;
    color: #525252;
    padding: 6px 20px;
    border: none;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    font-size: 14pt;
    font-family: "Pretendard";
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }

  li {
    padding: 0;
    margin: 0;
    display: flex;
    align-items: center;
  }
  li.active > span {
    color: black;
    background-color: #eeeeee;
    border-color: #dee2e6 #dee2e6 #fff;
  }
</style>
