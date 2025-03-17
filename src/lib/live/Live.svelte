<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    // import Hls from "hls.js";
    import Hls, { Level } from "hls.js";
    import { LiveFetcher, LiveLogger, ChatSocket } from "$lib";
    import type { LiveInfoResponse } from "$lib";

    // DOM 요소 바인딩
    let input_layer = $state<HTMLElement | null>(null);
    let setting_layer = $state<HTMLElement | null>(null);
    let player_layer = $state<HTMLElement | null>(null);
    let error_layer = $state<HTMLElement | null>(null);

    let videoElement = $state<HTMLVideoElement | null>(null);
    let time = $state<number>(0);
    let duration = $state<number>(0);
    let paused = $state<boolean>(false);
    let videoHeight = $state<number>(0);

    let qualities = $state<[string, Level][]>([]);
    let selectedQuality = $state<Level | undefined>(undefined);

    let settingShown = $state<boolean>(false);
    let setting_content = $state<HTMLElement | null>(null);

    let hls = $state(
        new Hls({
            autoStartLoad: true,
            levelLoadingRetryDelay: 100,
            levelLoadingMaxRetry: 20,
            levelLoadingMaxRetryTimeout: 20000,
            lowLatencyMode: false,
            liveBackBufferLength: 10,
            initialLiveManifestSize: 1,
            ignoreDevicePixelRatio: true,
            liveSyncDuration: 2,
            liveMaxLatencyDuration: 4,
            maxStarvationDelay: 10,
            maxAudioFramesDrift: 0,
            nudgeMaxRetry: 20,
        }),
    );

    let volume_percent = $state<number>(50);

    let timeoutID = $state<NodeJS.Timeout | undefined>(undefined);
    let errorMsg = $state<string>("");
    let errorCount = $state<number>(0);

    let liveInfo = $state<LiveInfoResponse | undefined>(undefined);

    // props 정의
    let {
        idx,
        showPopup,
        onMoveClick,
        onFlush,
        register,
        uuid,
        guid,
    }: {
        idx: number;
        showPopup: (idx: number) => void;
        onMoveClick: (idx: number) => void;
        onFlush: (bjid: string) => void;
        register: (
            idx: number,
            component: (info: LiveInfoResponse) => Promise<void>,
        ) => void;
        uuid: string;
        guid: string;
    } = $props();

    let liveFetcher = $state<LiveFetcher | null>(null);
    let liveLogger = $state<LiveLogger | null>(null);
    let chatSocket = $state<ChatSocket | null>(null);

    let userCount = $state<number>(0);

    // 컴포넌트 초기화
    onMount(() => {
        register(idx, set_stream);

        const preventContextMenu = (event: Event) => {
            event.preventDefault();
        };

        document.addEventListener("contextmenu", preventContextMenu);
        showLayer(input_layer!);

        liveFetcher = new LiveFetcher();
        liveLogger = new LiveLogger(uuid, guid, onUserUpdate, onCrash);
        chatSocket = new ChatSocket(
            () => {},
            () => {},
            undefined,
            undefined,
            {
                showBalloons: true,
                showFollows: true,
                showKicks: true,
                showMission: true,
                showMissionSettle: true,
                showSubscriptions: true,
            },
        );
        liveInfo = undefined;

        // cleanup function
        return () => {
            document.removeEventListener("contextmenu", preventContextMenu);
            flush();
            hls.destroy();
        };
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
            if (setting_content) {
                setting_content.style.display = "none";
                setting_layer!.style.opacity = "0";
            }
        } else {
            settingShown = true;
            if (setting_content) {
                setting_content.style.display = "flex";
                setting_layer!.style.opacity = "1";
            }
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
            if (layer) layer.style.display = "none";
        });
    }

    function showLayer(layer: HTMLElement) {
        if (layer.classList.contains("layer") == false) {
            throw new Error("You MUST use 'showLayer' func for layers only.");
        }

        hideAllLayer();
        layer.style.display = "flex";
    }

    async function set_stream(info: LiveInfoResponse, password?: string) {
        let proxy_url = await liveFetcher!.get_master_stream(info, password);

        hls.loadSource(proxy_url);
        hls.attachMedia(videoElement!);
        videoElement!.load();
        showLayer(player_layer!);

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log(
                "manifest loaded, found " +
                    data.levels.length +
                    " quality level",
            );
            qualities = data.levels.map((level) => {
                return [level.height + "p", level];
            });

            liveLogger!.initializeWebSocket(info);
            chatSocket!.initializeWebSocket(info, document.cookie);
            liveInfo = info;
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

    function showError(msg: string) {
        errorMsg = msg;
        if (timeoutID) clearTimeout(timeoutID);
        showLayer(error_layer!);
    }

    function flush() {
        if (timeoutID) clearTimeout(timeoutID);

        errorCount = 0;
        if (settingShown) {
            toggleSettings();
        }

        if (videoElement) {
            hls.detachMedia();
            hls.stopLoad();
        }

        if (liveLogger) liveLogger.close();
        if (chatSocket) chatSocket.close();

        if (liveInfo) {
            onFlush(liveInfo.BJID);
            liveInfo = undefined;
        }

        if (input_layer) showLayer(input_layer);
        console.warn("flushed!");
    }

    function streamTimeout() {
        if (timeoutID) clearTimeout(timeoutID);
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
        oncontextmenu={toggleSettings}
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
                    onchange={onQualityChange}
                >
                    <option value={undefined}>자동</option>
                    {#each qualities as quality}
                        <option value={quality[1]}>{quality[0]}</option>
                    {/each}
                </select>
            </div>

            <button onclick={flush}>종료</button>
        </div>
    </div>

    <div class="input layer" style="display:flex;" bind:this={input_layer}>
        <button onclick={() => showPopup(idx)}>방송 추가하기</button>
    </div>

    <div class="error layer" style="display:none" bind:this={error_layer}>
        <div class="error-label">
            {errorMsg}
        </div>
        <button class="error-button" onclick={flush}>돌아가기</button>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="player layer"
        style="display:none"
        bind:this={player_layer}
        onclick={() => {
            onMoveClick(idx);
        }}
        oncontextmenu={toggleSettings}
    >
        <video
            bind:this={videoElement}
            bind:currentTime={time}
            bind:duration
            volume={volume_percent / 100}
            bind:paused
            bind:videoHeight
            autoplay
            preload="auto"
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
