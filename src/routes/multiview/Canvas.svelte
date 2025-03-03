<script>
    import { SvelteComponent } from "svelte";
    import Slot from "./Slot.svelte";
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
            preserveAspectRatio: false,
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

    function addNewSlot() {
        let canvas = document.getElementById("canvas");
    }
</script>

<div class="resize-drag" id="canvas">
    <svelte:component this={Slot} />
</div>

<style>
    .resize-drag {
        background-color: #29e;
        color: white;
        font-size: 20px;
        font-family: sans-serif;

        height: 400px;
        width: 540px;
        padding: 10px;

        /* This makes things *much* easier */
        box-sizing: border-box;
    }
</style>
