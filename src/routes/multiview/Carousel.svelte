<script lang="ts">
    import { onMount } from "svelte";
    import type { itemInfo } from "./subStatus";

    // 슬라이더에 표시할 아이템들을 props로 받을 수 있습니다
    export let items: itemInfo[] = [];

    let carousel: HTMLDivElement;
    let containerWidth = 0;
    let itemWidth = 0;
    let currentIndex = 0;
    let visibleItems = 0;
    let transform = "translateX(0px)";

    export let selectedID: string | undefined;

    // 버튼 상태
    $: isPrevDisabled = currentIndex <= 0;
    $: isNextDisabled = currentIndex >= items.length - visibleItems - 1;

    onMount(() => {
        // 컴포넌트가 마운트된 후 아이템 너비 계산
        const firstItem = carousel.querySelector(".carousel-item");
        if (firstItem) {
            console.log("clientwidth: ", firstItem.clientWidth);
            itemWidth =
                firstItem.clientWidth +
                parseInt(getComputedStyle(firstItem).marginRight);

            // 보이는 아이템 수 계산
            updateVisibleItems();
        }
    });

    // 컨테이너 너비가 변경될 때 보이는 아이템 수를 업데이트
    $: if (containerWidth > 0) {
        const firstItem = carousel.querySelector(".carousel-item");

        if (!firstItem) {
            visibleItems = 0;
        } else {
            itemWidth =
                firstItem.clientWidth +
                parseInt(getComputedStyle(firstItem).marginRight);
            updateVisibleItems();
        }
    }

    function updateVisibleItems() {
        visibleItems = Math.floor(containerWidth / itemWidth);
        // 현재 인덱스가 유효 범위를 벗어나면 조정
        if (currentIndex > items.length - visibleItems) {
            goToSlide(Math.max(0, items.length - visibleItems));
        }
    }

    // 슬라이드로 이동
    function goToSlide(index: number) {
        currentIndex = Math.max(index, 0);
        transform = `translateX(${-currentIndex * itemWidth}px)`;
    }

    // 이전 슬라이드로 이동
    function prevSlide() {
        if (currentIndex > 0) {
            goToSlide(currentIndex - 6);
        }
        console.log("currentIndex : ", currentIndex);
    }

    // 다음 슬라이드로 이동
    function nextSlide() {
        if (currentIndex < items.length - visibleItems) {
            goToSlide(currentIndex + 6);
        }
    }

    function selectItem(id: itemInfo["id"]) {
        if (selectedID == id) {
            deselectItem();
        } else {
            selectedID = id;
        }
    }

    function deselectItem() {
        selectedID = undefined;
    }
</script>

<div class="carousel-wrap">
    <button
        class="carousel-button prev"
        on:click={prevSlide}
        disabled={isPrevDisabled}
        aria-label="이전 슬라이드"
    >
    </button>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="carousel-container" bind:clientWidth={containerWidth}>
        {items.length == 0 ? "등록된 항목이 없습니다." : ""}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="carousel"
            bind:this={carousel}
            style="transform: {transform}"
        >
            {#each items as item, i}
                <div
                    class="carousel-item"
                    class:selected={item.id == selectedID}
                    on:click={() => {
                        selectItem(item.id);
                    }}
                >
                    {item.nick}
                </div>
            {/each}
        </div>
    </div>
    <button
        class="carousel-button next"
        on:click={nextSlide}
        disabled={isNextDisabled}
        aria-label="다음 슬라이드"
    >
    </button>
</div>

<style>
    .carousel-wrap {
        position: relative;
        display: flex;
        width: 100%;
        height: 100px;
        align-items: center;
        justify-content: center;
        margin-top: 40px;
    }

    .carousel-container {
        color: gray;
        font-size: large;
        position: relative;
        width: 100% - 30px;
        overflow: hidden;
        margin-top: 0;
        margin-bottom: 0;
    }

    .carousel {
        align-items: center;
        display: flex;
        transition: transform 0.3s ease-out;
    }

    .carousel-item {
        box-sizing: border-box;
        min-width: 60px;
        max-width: 60px;
        height: 60px;
        margin-right: 10px;
        border-radius: 25%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 8pt;
        color: white;
        user-select: none;
        background-color: #3498db;
        transition:
            min-width 0.3s,
            height 0.3s;
    }

    .carousel-item.selected {
        border: 3px solid red;
    }

    .carousel-item:hover {
        min-width: 75px;
        max-width: 75px;
        height: 75px;
    }

    .carousel-item:nth-child(3n + 2) {
        background-color: #e74c3c;
    }
    .carousel-item:nth-child(3n + 3) {
        background-color: #2ecc71;
    }

    /* 페이지네이션 버튼 */
    .carousel-button {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 100px;
        background-color: rgba(255, 255, 255, 0.7);
        border: none;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 20px;
        z-index: 10;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(5px);
    }

    .carousel-button:hover:not([disabled]) {
        background-color: rgba(255, 255, 255, 0.9);
    }

    .carousel-button[disabled] {
        opacity: 0.5;
        cursor: default;
    }

    .carousel-button.prev {
        border-top-right-radius: 8px;
        border-bottom-right-radius: 8px;
        left: 0px;
    }

    .carousel-button.next {
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
        right: 0px;
    }

    /* 좌우 블러 효과 */
    .carousel-container::before,
    .carousel-container::after {
        content: "";
        position: absolute;
        top: 0;
        width: 50px;
        height: 100%;
        z-index: 5;
        pointer-events: none;
    }
</style>
