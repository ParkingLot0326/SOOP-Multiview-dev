<script lang="ts">
    import { carouselItemInfo } from "$lib";

    let {
        items = [
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
            new carouselItemInfo("1", "123"),
        ],
        selectedID = $bindable(undefined),
    } = $props<{
        items?: carouselItemInfo[];
        selectedID?: string;
    }>();

    // 상태 변수들
    let carousel = $state<HTMLDivElement | null>(null);
    let containerWidth = $state(0);
    let itemWidth = $state(0);
    let currentIndex = $state(0);
    let visibleItems = $state(0);
    let transform = $state("translateX(0px)");

    // 파생 상태
    let isPrevDisabled = $derived(currentIndex <= 0);
    let isNextDisabled = $derived(
        currentIndex >= items.length - visibleItems - 1,
    );

    // DOM 요소 측정과 업데이트
    function measureItem() {
        if (!carousel) return;

        const firstItem = carousel.querySelector(".carousel-item");
        if (!firstItem) {
            visibleItems = 0;
            return;
        }

        itemWidth =
            firstItem.clientWidth +
            parseInt(getComputedStyle(firstItem).marginRight);
        updateVisibleItems();
    }

    // 컨테이너 너비 변경 시 측정 업데이트
    $effect(() => {
        if (containerWidth > 0 && carousel) {
            measureItem();
        }
    });

    // 컴포넌트 초기화 및 아이템 변경 시
    $effect(() => {
        if (carousel && items.length > 0) {
            // 아이템이 로드된 후 측정을 위한 지연 실행
            setTimeout(measureItem, 0);
        }
    });

    function updateVisibleItems() {
        if (itemWidth <= 0) return;

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
        if (!isPrevDisabled) {
            goToSlide(currentIndex - 6);
        }
    }

    // 다음 슬라이드로 이동
    function nextSlide() {
        if (!isNextDisabled) {
            goToSlide(currentIndex + 6);
        }
    }

    function selectItem(id: carouselItemInfo["id"]) {
        selectedID = selectedID === id ? undefined : id;
    }
</script>

<div class="carousel-wrap">
    <button
        class="carousel-button prev"
        onclick={prevSlide}
        disabled={isPrevDisabled}
        aria-label="이전 슬라이드"
    >
    </button>

    <div class="carousel-container" bind:clientWidth={containerWidth}>
        {#if items.length === 0}
            <div class="empty-message">등록된 항목이 없습니다.</div>
        {:else}
            <div
                class="carousel"
                bind:this={carousel}
                style="transform: {transform}"
            >
                {#each items as item}
                    <div
                        class="carousel-item"
                        class:selected={item.id === selectedID}
                        onclick={() => selectItem(item.id)}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) =>
                            e.key === "Enter" && selectItem(item.id)}
                    >
                        {item.nick}
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <button
        class="carousel-button next"
        onclick={nextSlide}
        disabled={isNextDisabled}
        aria-label="다음 슬라이드"
    >
    </button>
</div>

<style>
    .carousel-wrap {
        box-sizing: border-box;
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
        width: 100%;
        overflow: hidden;
        margin-top: 0;
        margin-bottom: 0;
        padding: 32px;
    }

    .empty-message {
        text-align: center;
        padding: 20px;
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
        cursor: pointer;
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
        width: 25px;
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
        opacity: 0.4;
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
