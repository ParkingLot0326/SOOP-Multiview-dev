<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Hls from "hls.js";
    import { Level } from "hls.js";
    import { LiveLogger } from "./liveLogger";
    import type { LiveInfoResponse } from "./LiveInfoResponse";
    import { ChatSocket } from "./chat";
    import { LiveFetcher } from "./live";

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
    let selectedQuality: Level | undefined;

    let settingShown: boolean = false;
    let setting_content: HTMLElement;

    let hls = new Hls({
        startLevel: -1,
        autoStartLoad: true,
        levelLoadingRetryDelay: 100,
        levelLoadingMaxRetry: 20,
        levelLoadingMaxRetryTimeout: 20000,
        lowLatencyMode: false,
        liveBackBufferLength: 10,
        initialLiveManifestSize: 1,
        ignoreDevicePixelRatio: true,
        liveSyncDuration: 2,
        liveMaxLatencyDuration: 12,
        maxStarvationDelay: 4,
        maxAudioFramesDrift: 0,
        nudgeMaxRetry: 20,
    });

    let volume_percent: number;
    let volume: number;
    $: {
        volume = volume_percent / 100;
    }

    let timeoutID: NodeJS.Timeout;
    let errorMsg: string;
    let errorCount = 0;

    let liveInfo: LiveInfoResponse | undefined;

    export let idx: number;
    export let showPopup: (idx: number) => void;
    export let onMoveClick: (idx: number) => void;
    export let onFlush: (bjid: string) => void;
    export let register: (
        idx: number,
        component: (info: LiveInfoResponse) => Promise<void>,
    ) => void;

    export let uuid: string;
    export let guid: string;

    export let lowLatency: boolean = false;

    $: {
        lowLatency
            ? (hls.config.liveSyncDuration = 2)
            : (hls.config.liveSyncDuration = 12);
    }

    let liveFetcher: LiveFetcher;
    let liveLogger: LiveLogger;
    let chatSocket: ChatSocket;

    let userCount: number = 0;

    function set_lowLatency() {
        hls.config.liveSyncDuration = 2;
    }

    onMount(() => {
        register(idx, set_stream);

        const preventContextMenu = (event) => {
            event.preventDefault();
        };

        document.addEventListener("contextmenu", preventContextMenu);
        hideAllLayer;

        liveFetcher = new LiveFetcher();
        liveLogger = new LiveLogger(uuid, guid, onUserUpdate, onCrash);
        chatSocket = new ChatSocket();
        liveInfo = undefined;

        return () => {
            document.removeEventListener("contextmenu", preventContextMenu);
        };
    });

    onDestroy(() => {
        flush();
        hls.destroy();
    });

    function onCrash() {
        flush();
        showError("서버와의 동기화가 끊어져 스트림을 종료했습니다.");
    }

    function onUserUpdate(userCnt: number) {
        userCount = userCnt;
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
        if (selectedQuality) {
            let targetLevelIdx = hls.levels.findIndex((level) => {
                return level.height == selectedQuality!.height;
            });
            hls.nextLevel = targetLevelIdx;
        } else {
            hls.nextLevel = -1;
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

    export async function set_stream(
        info: LiveInfoResponse,
        password?: string,
    ) {
        let proxy_url = await liveFetcher.get_master_stream(info, password);

        hls.loadSource(proxy_url);
        hls.attachMedia(videoElement);
        videoElement.load();
        showLayer(player_layer);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log(
                "manifest loaded, found " +
                    data.levels.length +
                    " quality level",
            );
            qualities = data.levels.map((level) => {
                return [level.height + "p", level];
            });

            liveLogger.initializeWebSocket(info);
            chatSocket.initializeWebSocket(info, document.cookie);
            info = info;
        });

        hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
            streamTimeout();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            console.log("level switched: ", data.level);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
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
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        if (
                            data.details == Hls.ErrorDetails.LEVEL_EMPTY_ERROR
                        ) {
                            break;
                        }
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        errorCount++;
                        if (errorCount > 20) {
                            showError(
                                "스트림을 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.",
                            );
                            flush();
                        }
                        break;
                }
                console.warn("A NonFatal Error Occurred: ", data);
            }
        });
    }

    // export function onCookieChange() {

    // }

    function showError(msg: string) {
        errorMsg = msg;
        clearTimeout(timeoutID);
        showLayer(error_layer);
    }

    function flush() {
        clearTimeout(timeoutID);

        errorCount = 0;
        if (settingShown) {
            toggleSettings();
        }

        hls.detachMedia();
        hls.stopLoad();

        liveLogger.close();
        chatSocket.close();
        if (liveInfo) {
            onFlush(liveInfo.BJID);
        }

        showLayer(input_layer);
        console.warn("flushed!");
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
                    <option value={undefined}>자동</option>
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
        <button on:click={() => showPopup(idx)}>방송 추가하기</button>
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
            controls
        >
            <track kind="captions" />
        </video>
        <div class="user_count_wrap">
            <div class="rec"></div>
            <div class="user-count">
                {userCount}
            </div>
        </div>
    </div>
</div>

<style>
    .wrapper {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.25);
        opacity: 1;
        border-radius: 4px;
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

    .input > button {
        width: calc(100%);
        height: calc(100%);
        border-radius: 4px;
        border: 0;
        cursor: pointer;
        font-family: "Pretendard";
        font-size: calc(0.8rem + 40%);
        font-weight: 600;
    }

    .input > button:hover {
        background-color: rgba(255, 255, 255, 0.7);
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
        background-color: transparent;
    }

    .rec {
        width: 8px;
        height: 8px;
        background-color: red;
        border-radius: 50%;
    }

    .user_count_wrap {
        display: flex;
        align-items: center;
        position: absolute;
        top: 4px;
        left: 4px;
        background-color: hsla(0, 0%, 0%, 0.5);
        border-radius: 10px;
        height: 20px;
        padding: 4px 6px;
        gap: 4px;
    }
    .user-count {
        position: relative;
        color: rgb(255, 255, 255);
    }

    video {
        position: relative;
        width: 100%;
        height: 100%;
        flex-grow: 1;
    }
</style>
