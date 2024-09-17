<script module lang="ts">
export interface Props {
    value: Timecode,
}
</script>

<script lang="ts">
import { Timecode } from "./timecode.svelte";
import { mod } from "./math";

let {
    value = $bindable(),
}: Props = $props();

type ListItem = HTMLLIElement | HTMLInputElement;
type ElementId = "hours" | "minutes" | "seconds" | "frames"

let cursor: number = $state(0);
let button: HTMLButtonElement | null = $state(null);

let active: boolean = $state(false);

let hrs: ListItem | null = $state(null);
let mins: ListItem | null = $state(null);
let secs: ListItem | null = $state(null);
let frames: ListItem | null = $state(null);

// NOTE: Bad you say? I can recommend a therapist for you.
$effect(() => {
    hrs!.focus();
});

$effect(() => {
    mins!.focus();
});

$effect(() => {
    secs!.focus();
});

$effect(() => {
    frames!.focus();
});

let setHrs = $derived(active && cursor === 3);
let setMins = $derived(active && cursor === 2);
let setSecs = $derived(active && cursor === 1);
let setFrames = $derived(active && cursor === 0);

function updateValue(newValue: string) {
    if (newValue.length > 0) {
        switch (cursor) {
            case 0: { value.frames = parseInt(newValue) } break;
            case 1: { value.secs = parseInt(newValue) } break;
            case 2: { value.mins = parseInt(newValue) } break;
            case 3: { value.hrs = parseInt(newValue) } break;
        }
    }
}

function handleCaptureToggle(event: Event): void {
    active = true;
    cursor = 0;
}

function handleTimecodeValue(event: Event): void {
    const inputEvent = event as Event & { target: EventTarget & HTMLInputElement };
    if (inputEvent.target.value.length < 2) {
        inputEvent.target.value = inputEvent.target.value
            .replaceAll(/[^0-9]/g, "");
    } else {
        const inputValue = inputEvent.target.value;
        updateValue(inputValue);
        cursor = mod(cursor + 1, Timecode.TOTAL_PARTS);
        if (cursor === 0) {
            active = false;
        } else {
            switch(cursor) {
                case 0: { frames?.focus(); } break;
                case 1: { secs?.focus(); } break;
                case 2: { mins?.focus(); } break;
                case 3: { hrs?.focus(); } break;
            }
        }
    }
}
</script>

{#snippet listOrInput(id: ElementId, active: boolean)}
    {#if active}
        {#if id === "hours"}
            <input bind:this={hrs} id={id} oninput={handleTimecodeValue}>
        {:else if id === "minutes"}
            <input bind:this={mins} id={id} oninput={handleTimecodeValue}>
        {:else if id === "seconds"}
            <input bind:this={secs} id={id} oninput={handleTimecodeValue}>
        {:else if id === "frames"}
            <input bind:this={frames} id={id} oninput={handleTimecodeValue}>
        {/if}
    {:else}
        {#if id === "hours"}
            <li bind:this={hrs} id={id}>{value.parts[Timecode.HRS_INDEX].toString().padStart(2, "0")}</li>
        {:else if id === "minutes"}
            <li bind:this={mins} id={id}>{value.parts[Timecode.MINS_INDEX].toString().padStart(2, "0")}</li>
        {:else if id === "seconds"}
            <li bind:this={secs} id={id}>{value.parts[Timecode.SECS_INDEX].toString().padStart(2, "0")}</li>
        {:else if id === "frames"}
            <li bind:this={frames} id={id}>{value.parts[Timecode.FRAMES_INDEX].toString().padStart(2, "0")}</li>
        {/if}
    {/if}
{/snippet}

<button class="capture-root" bind:this={button} onclick={handleCaptureToggle}>
    <ul class="timecode">
        {@render listOrInput("hours", setHrs)}
        <li>:</li>
        {@render listOrInput("minutes", setMins)}
        <li>:</li>
        {@render listOrInput("seconds", setSecs)}
        <li>:</li>
        {@render listOrInput("frames", setFrames)}
    </ul>
</button>

<style lang="scss">
@import "$lib/style.scss";

input {
    width: 2rem;
    background-color: $blue-2;
    border: 1px solid $blue-3;
    border-radius: 4px;
    appearance: none;
    font-weight: bold;
    text-align: center;
    margin: 0px 8px;

    &:focus {
        appearance: none;
        border: none;
    }

    &:active {
        appearance: none;
        border: none;
    }
}

.timecode {
    position: relative;
    @include flex(start, start, row);
    gap: 2px;
    font-weight: bold;

    > * {
        font-size: 1.25rem;
    }

    li {
        border-radius: 4px;
    }
}
</style>
