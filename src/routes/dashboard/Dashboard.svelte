<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { onMount } from "svelte";

    let streamers: object = {};

    interface Streamer {
        bjnick: string;
        do_check_live: boolean;
        custom_color: string;
    }

    onMount(async () => {
        streamers = await invoke("read_streamers");
        console.log(streamers);
    });
</script>

<div class="dashboard-root-layout">
    <div class="list-area-layout">
        {#each Object.entries(streamers) as [id, info]}
            <div class="list-item">
                {id}, {info.bjnick}
                <div id="rec-status"></div>
                <div id="status"></div>
                <div class="indicator"></div>
            </div>
        {/each}
    </div>
    <div class="sub-area-layout"></div>
</div>

<style>
    .dashboard-root-layout {
        display: flex;
        flex-grow: 1;
        width: 100%;
        height: 100%;
        gap: 8px;
    }

    .list-area-layout {
        overflow: hidden;
        background-color: transparent;
        border-radius: 4px;
        flex-grow: 1;
    }

    .list-item {
        display: flex;
        flex-grow: 1;
        border: 1px solid black;
        padding: 8px;
        justify-content: center;
        justify-items: center;
        align-items: center;
        height: 52px;
    }

    .sub-area-layout {
        background-color: red;
        width: 300px;
        border-radius: 4px;
        flex-shrink: 0;
        flex-grow: 0;
    }
</style>
