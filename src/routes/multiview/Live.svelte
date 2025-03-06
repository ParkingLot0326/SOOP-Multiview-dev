<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { LiveRequest } from "./live";
    import Hls from "hls.js";

    let live: LiveRequest;
    let player_url: string;
    let url_input_layer: HTMLElement;
    let additional_info_layer: HTMLElement;
    let player_layer: HTMLElement;

    let quality = "original";
    let password: string;

    let videoElement: HTMLVideoElement;
    let time: number;
    let duration: number;
    let paused: boolean;
    export let volume: number;

    let hls = new Hls();

    export let child;

    onMount(() => {
        hideAllLayer;
    });

    onDestroy(() => {
        hls.destroy();
    });

    function hideAllLayer() {
        let layers = [url_input_layer, additional_info_layer, player_layer];
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

    async function init_w_url(url: string) {
        live = new LiveRequest(url);

        await live.post_live_info();

        if (live.liveInfo?.BPWD == "Y") {
            showLayer(additional_info_layer);
        } else {
            await live.get_playlist(quality, password).then((res) => {
                set_video(res![0]!, res![1]!);
            });

            showLayer(player_layer);
        }
    }

    function set_password() {
        let password_input: HTMLInputElement | null =
            document.querySelector(".password-input");
        password = password_input!.value;
    }

    function check_password() {
        let password_input: HTMLInputElement | null =
            document.querySelector(".password-input");
        // let quality_select_wrapper: HTMLElement | null =
        //     document.querySelector(".quality-wrapper");

        // live.liveInfo?.VIEWPRESET?.forEach((quality) => {
        //     let option = document.createElement("div");
        //     option.setAttribute("class", "quality");
        //     option.innerText = quality.name;
        //     quality_select_wrapper!.appendChild(option);
        //     console.log(quality.label);
        // });

        if (live.liveInfo?.BPWD == "Y") {
            try {
                password_input!.disabled = false;
            } catch {}
        } else {
            password_input!.disabled = true;
        }
    }

    async function set_video(url: string, aid: string) {
        let proxy_url = `http://proxy.localhost/stream?url=${encodeURIComponent(url)}&method=GET&query=${encodeURIComponent(JSON.stringify({ aid: aid }))}`;
        hls.lowLatencyMode = true;
        hls.loadSource(proxy_url);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            console.log(
                "manifest loaded, found " +
                    data.levels.length +
                    " quality level",
            );
        });
        videoElement.volume = 0;

        console.log(hls.media?.src);
        console.log(hls);
        // videoElement.load();
    }
</script>

<div class="wrapper">
    <div
        class="url-input layer"
        style="display:flex"
        bind:this={url_input_layer}
    >
        <div>
            <input type="text" placeholder="방송 URL" bind:value={player_url} />
            <button
                on:click={() => {
                    init_w_url(player_url);
                }}>입장 #{child.id}</button
            >
        </div>
    </div>

    <div
        class="additional-info layer"
        style="display:none"
        bind:this={additional_info_layer}
    >
        <div class="quality-wrapper">
            <div class="quality" style="display:none"></div>
        </div>
        <input type="text" class="password-input" placeholder="password" />
    </div>

    <div class="player layer" style="display:none" bind:this={player_layer}>
        <video
            bind:this={videoElement}
            bind:currentTime={time}
            bind:duration
            bind:volume
            bind:paused
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
        min-height: 200px;
        width: 100%;
        height: 100%;
        background-color: white;
        opacity: 1;
    }

    .layer {
        position: relative;
        align-self: center;
        justify-content: center;
        align-content: center;
        width: 100%;
        height: 100%;
    }

    .additional-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-grow: 1;
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
        border: 1px solid black;
    }

    .password-input {
        height: 30px;
    }

    .quality-wrapper {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        width: 100%;
        gap: 4px;
        color: black;
    }

    .quality {
        width: 100%;
        background-color: lightgray;
        border: 1px solid black;
        color: black;
    }
</style>
