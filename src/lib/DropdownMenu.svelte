<script module lang="ts">
import { Css } from "./css.svelte";

export const enum MenuKind {
    SELECT = 0,
}

export type InputChangedEvent = Event & { target: EventTarget & HTMLInputElement | null, currentTarget: EventTarget & HTMLInputElement };

export interface SearchParameters {
    data?: Set<string>,
    oninput?: (event: InputChangedEvent, data?: Set<string>) => void,
}

export type Props = {
    id: DropdownMenuId,
    rect: Css.CssRect,
    kind: MenuKind,
    search?: SearchParameters,
};
</script>

<script lang="ts">
import { DropdownMenuId } from "./app.svelte";

let {
    id,
    rect,
    kind,
    search = undefined,
}: Props = $props();
</script>

{#snippet select(parameters?: SearchParameters)}
    <div class="select-search">
        <input
            type="text"
            autocomplete="off"
            oninput={(event) => { if (parameters?.oninput) parameters.oninput(event as InputChangedEvent, parameters.data); }}>
    </div>

    <ul class="select-list">
    {#if parameters?.data}
        {#each parameters.data as msg}
            <li>{msg}</li>
        {/each}
    {/if}
    </ul>
{/snippet}

<div data-id={id} class="root"
    style:--x={rect.x()}
    style:--y={rect.y()}
    style:--w={rect.w()}
    style:--h={rect.h()}>
    <div class="view">
        {#if kind === MenuKind.SELECT}
            {@render select(search)}
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

    :global(.select-search) {
        position: sticky;
        top: 0px;
        padding: 0.75rem;
        background-color: $blue-1;
        border-bottom: 1px solid $blue-3;
    }

    :global(.select-search input) {
        @include text-left();
        width: 100%;
        border: 1px solid $blue-3;
        border-radius: 8px;
        padding: 0.5rem;
        background-color: $blue-2;
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

        // animation: fade 500ms ease-in-out 1,
        //            slide 250ms ease-in-out 1;
    }
}
</style>
