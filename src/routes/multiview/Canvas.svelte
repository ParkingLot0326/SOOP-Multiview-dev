<script lang="ts">
    import Live from "./Live.svelte";
    import interact from "interactjs";

    interact(".resize-drag")
        .draggable({
            onmove: dragMoveListener,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: "parent",
                    endOnly: true,
                }),
            ],
        })
        .resizable({
            preserveAspectRatio: true,
            edges: { left: true, right: true, bottom: true, top: true },
        })
        .on("resizemove", function (event) {
            var target = event.target,
                x = parseFloat(target.getAttribute("data-x")) || 0,
                y = parseFloat(target.getAttribute("data-y")) || 0;

            // update the element's style
            target.style.width = event.rect.width + "px";
            target.style.height = event.rect.height + "px";

            // translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.webkitTransform = "translate(" + x + "px," + y + "px)";
            target.style.transform = "translate(" + x + "px," + y + "px)";

            target.setAttribute("data-x", x);
            target.setAttribute("data-y", y);
        });

    function dragMoveListener(event) {
        var target = event.target,
            // keep the dragged position in the data-x/data-y attributes
            x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx,
            y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

        // translate the element
        target.style.webkitTransform = `translate(${x}px,${y}px)`;
        target.style.transform = `translate(${x}px,${y}px)`;

        // update the posiion attributes
        target.setAttribute("data-x", x);
        target.setAttribute("data-y", y);
    }

    let children = [];
    let idCounter = 1;

    function addNewSlot() {}

    function addNewLiveWidget() {
        children = [...children, { id: idCounter }];
        idCounter++;
    }
</script>

<div style="display:flex; height: 100%; width: 100%;">
    <div class="button-area">
        <button on:click={addNewLiveWidget}>Add New Live Widget</button>
        <button on:click={() => {}}>Add New Chat Widget</button>
    </div>

    {#each children as child (child.id)}
        <div class="resize-drag">
            <Live {child} />
        </div>
    {/each}
</div>

<style>
    .button-area {
        pointer-events: none;
        display: flex;
        position: absolute;
        justify-content: center;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        top: 80px;
        right: 10px;
    }

    .button-area > button {
        pointer-events: all;
        cursor: pointer;
        padding: 10px;
    }

    .resize-drag {
        position: relative;

        background-color: #29e;
        color: white;
        font-size: 20px;
        font-family: sans-serif;
        aspect-ratio: 16 / 9;

        padding: 10px;

        /* This makes things *much* easier */
        box-sizing: border-box;
    }
</style>
