<script module lang="ts">
import { Css } from "./css.svelte";

export const enum MenuKind {
    SELECT = 0,
}

export type Props = {
    id: DropdownMenuId,
    rect: Css.CssRect,
    kind?: MenuKind,
    data?: Array<string>,
};
</script>

<script lang="ts">
import { DropdownMenuId } from "./app.svelte";

let {
    id,
    rect,
    kind = MenuKind.SELECT,
    data = [],
}: Props = $props();
</script>

{#snippet select(data: Array<string>)}
    <ul class="select-list">
    {#each data as msg}
        <li>{msg}</li>
    {/each}
    </ul>
{/snippet}

<div data-id={id} class="root"
    style:--x={rect.x()}
    style:--y={rect.y()}
    style:--w={rect.w()}
    style:--h={rect.h()}>
    <div class="view">
        {#if kind === MenuKind.SELECT}
            {@render select(data)}
        {/if}
    </div>
</div>

<style lang="scss">
@import "$lib/style.scss";

div.root {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--w);
    height: var(--h);
    overflow: hidden;
    padding: 1rem;
    z-index: 1000;

    :global(.select-list li) {
        padding: 1rem;

        &:hover {
            background-color: $blue-2;
        }
    }

    :global(.select-list li:not(:last-child)) {
        border-bottom: 1px solid $blue-3;
    }

    > .view {
        width: 100%;
        height: 100%;
        background-color: $blue-1;
        border: 1px solid $blue-3;
        box-shadow: 0px 0px 16px rgba(0, 0, 0, 0.5);
        border-radius: 8px;
        overflow-y: auto;

        @include keyframes-fade();
        @include keyframes-slide();

        animation: fade 500ms ease-in-out 1,
                   slide 250ms ease-in-out 1;
    }
}
</style>
