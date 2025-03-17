<script lang="ts">
    interface ChatBubbleProps {
        nickname: string;
        subscribe_months: number;
        subscribe_tier: number;
        message: string;
        timestamp: string;
        pcon_src?: string;
        badge_src?: string;
        badge_name?: string;
    }

    let { data }: { data: ChatBubbleProps } = $props();
</script>

<div class="bubble">
    <div class="userinfo-wrap">
        {#if data.pcon_src}
            <img
                class="PCON"
                src={data.pcon_src}
                alt="{data.subscribe_tier}티어 {data.subscribe_months}개월 구독자"
                title="{data.subscribe_tier}티어 {data.subscribe_months}개월 구독자"
            />
        {/if}
        {#if data.badge_src}
            <!-- content here -->
            <img
                class="BADGE"
                src={data.badge_src}
                alt={data.badge_name}
                title={data.badge_name}
            />
        {/if}
        <div class="NICKNAME">{data.nickname}</div>
        <span></span>
        <div class="UTIL">{data.timestamp}</div>
    </div>
    <div>{data.message}</div>
</div>

<style>
    .bubble {
        display: flex;
        flex-direction: column;
        padding: 8px;
        background-color: #a0a0a062;
        border-radius: 10px;
        margin: 10px;
        max-width: calc(100% - 20px);
        width: fit-content;
        gap: 4px;
    }

    .userinfo-wrap {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: start;
        padding: 0;
        gap: 2px;
    }

    .userinfo-cluster {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0;
    }

    .PCON {
        background-color: red;
        width: 20px;
        height: 20px;
    }

    .BADGE {
        background-color: blue;
        width: 20px;
        height: 20px;
    }

    .NICKNAME {
        font-size: 14px;
        font-weight: bold;
        margin-left: 4px;
    }

    .SPACING {
        flex-grow: 1;
    }

    .UTIL {
    }
</style>
