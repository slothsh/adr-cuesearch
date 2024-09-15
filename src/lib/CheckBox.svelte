<script module lang="ts">
export interface Props {
    checked: boolean,
    value: string,
    oninput: (event: Event) => void,
}
</script>

<script lang="ts">
let { 
    value,
    oninput,
    checked,
}: Props = $props();
</script>

<button data-value={value} data-checked={(checked) ? "" : null} {oninput}>
    {#if checked}
        <div class="checkmark"></div>
    {/if}
</button>

<style lang="scss">
@import "$lib/style.scss";

button {
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid $blue-3;
    border-radius: 4px;
    padding: 4px;
}

.checkmark {
    background-color: $blue-3;
    width: 100%;
    height: 100%;
    border-radius: 2px;
}
</style>
