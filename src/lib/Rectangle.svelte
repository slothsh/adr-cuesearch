<script module lang="ts">
import { Css } from "./css.svelte";
import { type Snippet } from "svelte";

export interface Props {
    target: Css.CssRect,
    tag?: string,
    style?: Css.CssStyleConfig,
    children?: Snippet,
}
</script>

<script lang="ts">

let {
    target,
    tag = "div",
    style = {},
    children = undefined,
}: Props = $props();

let computedStyle = $derived(Css.cssStyleString(style));
</script>

<svelte:element class="root"
    this={tag}
    style="left: {target.x()}; top: {target.y()}; width: {target.w()}; height: {target.h()}; {computedStyle}">
    {@render children?.()}
</svelte:element>

<style lang="scss">
.root {
    position: fixed;
}
</style>
