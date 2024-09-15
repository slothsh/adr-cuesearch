<script module lang="ts">
import { Css } from "./css.svelte";
import { SvelteSet } from "svelte/reactivity";
import { type Snippet } from "svelte";

export interface Props {
    dataId: number,
    target: Css.CssRect,
    data?: SvelteSet<string>,
    oninput?: (event: Event) => void,
    listItem: Snippet<[string]>,
}
</script>

<script lang="ts">
import Rect from "./Rectangle.svelte";

let {
    dataId,
    target,
    data,
    oninput = (event: Event) => {},
    listItem,
}: Props = $props();
</script>

<Rect {target}
    style={{
        zIndex: "1000",
        overflow: "hidden",
    }}>
    <div data-id={dataId} class="root">
        <div class="view">
            <div class="select-search">
                <input
                    type="text"
                    autocomplete="off"
                    {oninput}>
            </div>

            <ul class="select-list">
            {#if data}
                {#each data as value}
                    <li>
                        {#if listItem}
                            {@render listItem(value)}
                        {:else}
                            <big>{value}</big>
                        {/if}
                    </li>
                {/each}
            {/if}
            </ul>
        </div>
    </div>
</Rect>

<style lang="scss">
@import "$lib/style.scss";

div.root {
    overflow: hidden;
    padding: 1rem;
    width: 100%;
    height: 100%;

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

        animation: fade 500ms ease-in-out 1,
                   slide 250ms ease-in-out 1;
    }
}
</style>
