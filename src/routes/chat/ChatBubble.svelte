<script>
    export let chat = {
        nickname: "User",
        pcon: "https://via.placeholder.com/24",
        badge: "https://via.placeholder.com/20",
        message: "Lorem Ipsum dolor sit amet",
    };
</script>

<div class="bubble">
    <div class="userinfo-wrap">
        <div class="PCON"></div>
        <div class="BADGE"></div>
        <div class="NICKNAME">{chat.nickname}</div>
    </div>
    <div>{chat.message}</div>
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
