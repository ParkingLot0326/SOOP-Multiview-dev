<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Hls from "hls.js";
    import { Level } from "hls.js";

    let input_layer: HTMLElement;
    let setting_layer: HTMLElement;
    let player_layer: HTMLElement;
    let error_layer: HTMLElement;

    let videoElement: HTMLVideoElement;
    let time: number;
    let duration: number;
    let paused: boolean;
    let videoHeight: number;

    let qualities: [string, Level][];
    let selectedQuality: Level | string;

    let settingShown: boolean = false;
    let setting_content: HTMLElement;

    let hls = new Hls();

    let volume_percent: number;
    let volume: number;
    $: {
        volume = volume_percent / 100;
        console.log(volume);
    }

    let timeoutID;
    let errorCount = 0;

    export let idx: number;
    export let onPopUp: (idx: number) => void;
    export let onMoveClick: (idx: number) => void;
    export let register;

    onMount(() => {
        if (register) {
            register(idx, set_video);
        }

        const preventContextMenu = (event) => {
            event.preventDefault();
        };
        document.addEventListener("contextmenu", preventContextMenu);
        hideAllLayer;

        return () => {
            document.removeEventListener("contextmenu", preventContextMenu);
        };
    });

    onDestroy(() => {
        hls.destroy();
    });

    function showPopup(e: MouseEvent) {
        onPopUp(idx);
    }

    function toggleSettings() {
        if (settingShown) {
            settingShown = false;
            setting_content.style.display = "none";
            setting_layer.style.opacity = "0";
        } else {
            settingShown = true;
            setting_content.style.display = "flex";
            setting_layer.style.opacity = "1";
        }
        return false;
    }

    function onQualityChange() {
        if (typeof selectedQuality == "string") {
            hls.nextLevel = -1;
            return;
        } else {
            let targetLevelIdx = hls.levels.findIndex((level) => {
                return level.height == selectedQuality.height;
            });
            hls.nextLevel = targetLevelIdx;
        }
    }

    function hideAllLayer() {
        let layers = [input_layer, error_layer, player_layer];
        layers.forEach((layer) => {
            layer.style.display = "none";
        });
    }

    function showLayer(layer: HTMLElement) {
        if (layer.classList.contains("layer") == false) {
            throw new Error("You MUST use 'showLayer' func for layers only.");
        }

        hideAllLayer();
        layer.style.display = "flex";
    }

    let errorMsg: string;

    export async function set_video(proxy_url: string) {
        // hls.lowLatencyMode = true;
        hls.loadSource(proxy_url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            console.log(
                "manifest loaded, found " +
                    data.levels.length +
                    " quality level",
            );
            qualities = data.levels.map((level) => {
                return [level.height + "p", level];
            });
        });
        videoElement.load();
        showLayer(player_layer);

        hls.on(Hls.Events.FRAG_LOADED, function (event, data) {
            streamTimeout();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, function (event, data) {
            console.log("level switched", data.level);
        });

        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error("A network error occurred", data);
                        showError(
                            "스트림 요청 과정에서 오류가 발생했습니다. 다시 시도해 주세요.",
                        );
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error("A media error occurred", data);
                        showError(
                            "스트림을 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.",
                        );
                        break;
                    default:
                        console.error("An unrecoverable error occurred", data);
                        showError(
                            "알 수 없는 오류가 발생했습니다.\n문제가 계속될 경우 개발자에게 문의해 주세요.",
                        );
                        flush();
                        break;
                }
            } else {
                switch (data.type) {
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        errorCount++;
                        if (errorCount > 5) {
                            showError(
                                "스트림을 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.",
                            );
                            flush();
                        }
                        break;
                }
                console.error("An Error Occurred: ", data);
            }
        });
    }

    function showError(msg: string) {
        errorMsg = msg;
        clearTimeout(timeoutID);
        showLayer(error_layer);
    }

    function flush() {
        errorCount = 0;
        if (settingShown) {
            toggleSettings();
        }
        hls.detachMedia();
        hls.stopLoad();
        showLayer(input_layer);
        console.log("flushed!");
        clearTimeout(timeoutID);
    }

    function streamTimeout() {
        clearTimeout(timeoutID);
        timeoutID = setTimeout(() => {
            console.error("Stream Timeout..Flushing Stream..");
            flush();
        }, 10000);
    }
</script>

<div class="wrapper">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="setting layer"
        style="opacity:0;"
        bind:this={setting_layer}
        on:contextmenu={toggleSettings}
    >
        <div
            class="setting-content"
            bind:this={setting_content}
            style="display:none;"
        >
            <div style="display:flex; justify-content:start; gap:8px;">
                <div>볼륨</div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    bind:value={volume_percent}
                />
            </div>
            <div style="display:flex; justify-content:start; gap:8px;">
                <div>화질</div>
                <select
                    name="quality"
                    class="quality-select"
                    bind:value={selectedQuality}
                    on:change={onQualityChange}
                >
                    <option value="auto">자동</option>
                    {#each qualities as quality}
                        <option value={quality[1]}>{quality[0]}</option>
                    {/each}
                </select>
            </div>

            <button on:click={flush}>종료</button>
        </div>
    </div>

    <div class="input layer" style="display:flex;" bind:this={input_layer}>
        <!-- <div>
            <input type="text" placeholder="방송 URL" bind:value={player_url} />
            <button
                on:click={() => {
                    init_w_url(player_url);
                }}>입장</button
            >
        </div> -->
        <button
            on:click={showPopup}
            style="width:100%; height:100%; border: 0px; cursor: pointer;background-color:transparent;"
        >
            추가</button
        >
    </div>

    <div class="error layer" style="display:none" bind:this={error_layer}>
        <div class="error-label">
            {errorMsg}
        </div>
        <button class="error-button" on:click={flush}>돌아가기</button>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="player layer"
        style="display:none"
        bind:this={player_layer}
        on:click={() => {
            onMoveClick(idx);
        }}
        on:contextmenu={toggleSettings}
    >
        <video
            bind:this={videoElement}
            bind:currentTime={time}
            bind:duration
            bind:volume
            bind:paused
            bind:videoHeight
            autoplay
        >
            <track kind="captions" />
        </video>
    </div>
</div>

<style>
    .wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        background-color: white;
        opacity: 1;
        border: 1px solid black;
    }

    .layer {
        position: relative;
        align-self: center;
        justify-content: center;
        align-content: center;
        width: 100%;
        height: 100%;
    }

    .setting {
        pointer-events: none;
        position: absolute;
        flex-grow: 1;
        width: 200px;
        height: 100px;
        background-color: rgba(219, 219, 219, 0.8);
        backdrop-filter: blur(15px);
        z-index: 500;
        transition: all 0.1s;
        border-radius: 1rem;
    }

    .setting-content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 6px;
    }

    .setting > * {
        pointer-events: auto;
    }

    .error {
        position: absolute;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 10px;
        width: 200px;
        height: 100px;
        border-radius: 1rem;
        background-color: rgb(255, 55, 55);
        color: white;
        backdrop-filter: blur(15px);
    }

    .error > button {
        width: 100px;
    }

    .quality-select {
        border-radius: 4px;
    }

    .player {
        display: flex;
        flex-grow: 1;
        justify-content: center;
        align-items: center;
    }

    video {
        position: relative;
        width: 100%;
        height: 100%;
        flex-grow: 1;
    }
</style>
