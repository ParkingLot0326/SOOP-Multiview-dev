<script lang="ts">
    import Hls from "hls.js";
    import { onMount } from "svelte";

    let time: number = 0;
    let duration: number;
    let volume = 0.5;
    let paused = true;
    let showControls = true;
    let showControlsTimeout: number;
    // Used to track time of last mouse down event
    let lastMouseDown: Date;

    let videoElement: HTMLVideoElement;

    function handleMove(e) {
        // Make the controls visible, but fade out after
        // 2.5 seconds of inactivity
        // clearTimeout(showControlsTimeout);
        // showControlsTimeout = setTimeout(() => (showControls = false), 2500);
        // showControls = true;
        if (!duration) return; // video not loaded yet

        if (e.type !== "touchmove" && !(e.buttons & 1)) return;
        // mouse not down
        const clientX =
            e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        const { left, right } = this.getBoundingClientRect();
        time = (duration * (clientX - left)) / (right - left);
    }
    // we can't rely on the built-in click event, because it fires
    // after a drag - we have to listen for clicks ourselves
    function handleMousedown(e) {
        lastMouseDown = new Date();
        const clientX =
            e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
        const { left, right } = this.getBoundingClientRect();
        time = (duration * (clientX - left)) / (right - left);
    }
    function handleMouseup(e) {
        if (new Date().getTime() - lastMouseDown.getTime() < 300) {
            if (paused) e.target.play();
            else e.target.pause();
        }
    }

    function togglePlay() {
        if (!videoElement) return;

        if (paused) videoElement.play();
        else videoElement.pause();
    }

    function format(seconds: any) {
        if (isNaN(seconds)) return "...";
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        if (seconds < 10) seconds = "0" + seconds;
        return `${minutes}:${seconds}`;
    }

    async function request() {
        const res = await fetch("https://jsonplaceholder.typicode.com/posts");
        const data = await res.json();
        console.log(data);
    }

    function initHls() {
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(
                "https://vod-archive-global-cdn-z02.sooplive.co.kr/v102/video/_definst_/smil:vod/20241211/322/279469322/REGL_68938E9F_279469322_1.smil/playlist.m3u8",
            );
            hls.attachMedia(videoElement);
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                console.log(
                    "manifest loaded, found " +
                        data.levels.length +
                        " quality level",
                );
            });
        }
    }

    onMount(() => {
        initHls();
    });
</script>

<div>
    <video
        id="video"
        poster="https://sveltejs.github.io/assets/caminandes-llamigos.jpg"
        src="https://vod-archive-global-cdn-z02.sooplive.co.kr/v102/video/_definst_/smil:vod/20241211/322/279469322/REGL_68938E9F_279469322_1.smil/playlist.m3u8"
        bind:currentTime={time}
        bind:duration
        bind:paused
        bind:volume
        bind:this={videoElement}
    >
        <track kind="captions" />
    </video>
    <div class="controls" style="opacity: {duration && showControls ? 1 : 0}">
        <div class="info">
            <span class="time">{format(time)}</span>
            <!-- <span
                >click anywhere to {paused ? "play" : "pause"} / drag to seek</span
            > -->
            <span class="time">{format(duration)}</span>
        </div>
        <progress value={time / duration || 0}></progress>
    </div>
</div>
<div class="timestamps">
    <p>{Math.round(duration)}s</p>
    <p>{Math.round(time)}s ~ {Math.round(duration)}s</p>
</div>
<div class="buttons">
    <button on:click={togglePlay}>재생/일시정지</button>
    <input type="range" min="0" max="1" step="0.01" bind:value={volume} />
</div>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="trackline"
    role="navigation"
    on:mousemove={handleMove}
    on:touchmove|preventDefault={handleMove}
    on:mousedown={handleMousedown}
></div>

<style>
    div {
        position: relative;
    }
    .controls {
        position: absolute;
        bottom: 0;
        width: 100%;
        transition: opacity 1s;
    }
    .info {
        display: flex;
        width: 100%;
        justify-content: space-between;
    }
    span {
        padding: 0.2em 0.5em;
        color: white;
        text-shadow: 0 0 8px black;
        font-size: 1.4em;
        opacity: 0.7;
    }
    .time {
        width: 3em;
    }
    .time:last-child {
        text-align: right;
    }
    progress {
        display: block;
        width: 100%;
        height: 10px;
        -webkit-appearance: none;
        appearance: none;
    }
    progress::-webkit-progress-bar {
        background-color: rgba(0, 0, 0, 0.2);
    }
    progress::-webkit-progress-value {
        background-color: rgba(255, 255, 255, 0.6);
    }
    video {
        width: 100%;
    }
    .trackline {
        width: 100%;
        height: 100px;
        margin-top: 12px;
        background-color: rgba(0, 0, 0, 0.2);
    }
    .buttons {
        display: flex;
        justify-content: center;
        margin-top: 12px;
    }
    .timestamps {
        display: relative;
        width: 100%;
        justify-content: center;
        margin: 0px;
        padding: 0px;
    }
    .timestamps > p {
        margin: 0px;
        padding: 0px;
    }
</style>
