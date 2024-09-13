<script lang="ts">
import { Vec2 } from "$lib/vector.svelte";
import { Css } from "$lib/css.svelte";
import { ApiClient } from "$lib/apiClient.svelte";
import { type Search, type SearchTable, Parse as ApiParse } from "$lib/api.svelte";

interface SearchRequest {
    hash: ArrayBuffer,
    results: SearchTable,
}

type ViewSlice = { start: number, end: number, length: number };
type PromptEvent = Event & { target: EventTarget & HTMLInputElement | null };

let promptRect = $state(
    new Css.CssRect(
        { v: new Vec2(50, 50), unitX: Css.UnitKind.PERCENT, unitY: Css.UnitKind.PERCENT },
        { v: new Vec2(80, 72), unitW: Css.UnitKind.PERCENT, unitH: Css.UnitKind.PIXEL },
    )
);

let resultsTableRect = $state(
    new Css.CssRect(
        { v: new Vec2(50, 0), unitX: Css.UnitKind.PERCENT, unitY: Css.UnitKind.PERCENT },
        { v: new Vec2(80, 30), unitW: Css.UnitKind.PERCENT, unitH: Css.UnitKind.PERCENT },
    )
);

let expandButtonRect = $state(
    new Css.CssRect(
        { v: new Vec2(50, 68), unitX: Css.UnitKind.PERCENT, unitY: Css.UnitKind.PERCENT },
        { v: new Vec2(1, 1), unitW: Css.UnitKind.AUTO, unitH: Css.UnitKind.AUTO },
    )
);

const MAX_VIEW_SIZE = 25;
const TEXT_ENCODER = new TextEncoder();
const API_CLIENT = $state(new ApiClient("http://localhost:6969"));
const PAGINATION_TOTAL_PAGES = 4;
const SEARCH_DEBOUNCE_DELAY = 1000.0;

let searchRequest: SearchRequest | null = $state(null);
let tableBuffer: Promise<Search | null> | null = $state(null);
let viewSlice: ViewSlice | null = $state(null);
let toggled = $state(false);
let inputElement: HTMLFormElement | null = $state(null);
let numbersListElement: HTMLUListElement | null = $state(null);
let pageOffset = $state(0);
let debounceSearchLast = $state(performance.now());
let debounceId = $state(-1);

function expandTable() {
    toggled = !toggled;
    if (toggled) {
        promptRect.position.y = 7.5;
        resultsTableRect.dimensions.y = 78;
        expandButtonRect.position.y = 20;
    } else {
        promptRect.position.y = 50;
        expandButtonRect.position.y = 68;
        resultsTableRect.dimensions.y = 30;
    }
}

function updatePages(): void {
    if (numbersListElement && viewSlice) {
        const listItems = numbersListElement.querySelectorAll("li > button:not(#paginationOverflow)");
        const currentPage = Math.max(0, Math.ceil(viewSlice.start / MAX_VIEW_SIZE));

        if (listItems) {
            for (const item of listItems) {
                const id = parseInt(item.getAttribute("data-index")!);
                if (id === currentPage) {
                    item.setAttribute("add", "");
                } else {
                    item.removeAttribute("data-focused");
                }
            }
        }

        pageOffset = Math.max(0, Math.floor(viewSlice.end / MAX_VIEW_SIZE / PAGINATION_TOTAL_PAGES - (1 / PAGINATION_TOTAL_PAGES)));
    }
}

function setPage(event: MouseEvent) {
    if (event.target) {
        const target = event.target as EventTarget & HTMLButtonElement;

        if (numbersListElement && viewSlice) {
            const listItems = numbersListElement.querySelectorAll("li > button");
            if (listItems) {
                for (const item of listItems) {
                    if (item.id !== target.id) {
                        item.removeAttribute("data-focused");
                    } else {
                        target.setAttribute("data-focused", "");
                    }
                }
            }
        }

        const pageIndexResult = target.getAttribute("data-index");
        if (searchRequest && viewSlice && pageIndexResult) {
            const pageIndex = parseInt(pageIndexResult);
            viewSlice.start = pageIndex * MAX_VIEW_SIZE;
            viewSlice.end = Math.min(viewSlice.start + MAX_VIEW_SIZE, searchRequest.results.length);
            viewSlice = {
                start: viewSlice.start,
                end: viewSlice.end,
                get length() { return this.end - this.start; }
            };

            pageOffset = Math.max(0, Math.floor(viewSlice.end / MAX_VIEW_SIZE / PAGINATION_TOTAL_PAGES - (1 / PAGINATION_TOTAL_PAGES)));
        }
    }
}

function cyclePage(event: MouseEvent): void {
    if (event.target) {
        const target = event.target as EventTarget & HTMLButtonElement;
        const direction = target.getAttribute("data-direction");

        // TODO: warn viewSlice == null
        if (searchRequest && viewSlice && direction) {
            if (direction === "forward" && viewSlice.end < searchRequest.results.length) {
                viewSlice.start = viewSlice.end;
                viewSlice.end = Math.min(viewSlice.end + MAX_VIEW_SIZE, searchRequest.results.length);
            } else if (direction === "back" && viewSlice.start > 0) {
                viewSlice.end = viewSlice.start;
                viewSlice.start = Math.max(0, viewSlice.start - MAX_VIEW_SIZE);
            }

            viewSlice = {
                start: viewSlice.start,
                end: viewSlice.end,
                get length() { return this.end - this.start; }
            };

            updatePages();
        }
    }
}

function cyclePagination(_: MouseEvent) {
    if (searchRequest && viewSlice) {
        pageOffset = Math.min(pageOffset + 1, Math.max(0, Math.floor(searchRequest.results.length / MAX_VIEW_SIZE / PAGINATION_TOTAL_PAGES - (1 / PAGINATION_TOTAL_PAGES))));
        viewSlice.start = pageOffset * PAGINATION_TOTAL_PAGES * MAX_VIEW_SIZE;
        viewSlice.end = Math.min(viewSlice.start + MAX_VIEW_SIZE, searchRequest.results.length);
        viewSlice = {
            start: viewSlice.start,
            end: viewSlice.end,
            get length() { return this.end - this.start; }
        };
    }
}

function hex(hashBuffer: ArrayBuffer) {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""); 
}

function handleSearch(event: Event) {
    if (debounceId !== -1) { clearTimeout(debounceId); }

    debounceId = setTimeout((event: PromptEvent) => {
        const debounceSearchNow = performance.now();
        if ((debounceSearchNow - debounceSearchLast) >= SEARCH_DEBOUNCE_DELAY) {
            if (event.target?.value !== "") {
                tableBuffer = API_CLIENT.get(ApiParse.search, { q: "search", amount: "500" } );

                tableBuffer.then(async (results) => {
                    if (results === null) return;

                    const newEncoded = await window.crypto.subtle.digest("SHA-1", TEXT_ENCODER.encode(event.target?.value));
                    if (searchRequest !== null && hex(newEncoded) === hex(searchRequest.hash)) {
                        searchRequest.results = searchRequest.results.concat(results.data);
                    } else {
                        viewSlice = null;
                        searchRequest = {
                            hash: newEncoded,
                            results: results.data,
                        };
                    }

                    // TODO: dedup
                    if (!viewSlice) { viewSlice = { start: 0, end: 0, get length() { return this.end - this.start; } }; }
                    viewSlice = {
                        start: Math.max(0, viewSlice.start),
                        end: Math.min(viewSlice.start + MAX_VIEW_SIZE, searchRequest.results.length),
                        get length() { return this.end - this.start; }
                    };

                    updatePages();
                });
            }

            debounceSearchLast = debounceSearchNow;
        }
    }, SEARCH_DEBOUNCE_DELAY, event);
}
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
</svelte:head>

<div class="root">
    <form action="" bind:this={inputElement}
        style:--input-x={promptRect.x()}
        style:--input-y={promptRect.y()}
        style:--input-w={promptRect.w()}
        style:--input-h={promptRect.h()}>
        <input
            type="text"
            id="inputPrompt"
            name="query"
            placeholder="Start typing to search..."
            oninput={handleSearch}>

        <div id="parameters">
            <h2 style="align-self: center;">Search Parameters</h2>
            <div id="projects">
                Projects:
                <select name="projects" id="paramProject">
                    <option value="all">all</option>
                </select>
            </div>
            <div id="segments">
                Segments:
                <select name="segments" id="paramSegment">
                    <option value="all">all</option>
                </select>
            </div>
            <div id="speakers">
                Speakers:
                <select name="speakers" id="paramSpeakers">
                    <option value="all">all</option>
                </select>
            </div>
            <div id="timeRange">
                Time Range:
                <select name="timeRangeStart" id="paramTimeRangeStart">
                    <option value="all">00:00:00:00</option>
                </select>
                to
                <select name="timeRangeEnd" id="paramTimeRangeEnd">
                    <option value="all">00:00:00:00</option>
                </select>
            </div>
        </div>
    </form>

    <button id="expandButton" onclick={expandTable}
        style:--expand-x={expandButtonRect.x()}
        style:--expand-y={expandButtonRect.y()}
        style:--expand-w={expandButtonRect.w()}
        style:--expand-h={expandButtonRect.h()}>
        {#if toggled}Collapse{:else}Expand{/if}
    </button>
    <div id="results"
        style:--table-x={resultsTableRect.x()}
        style:--table-y={resultsTableRect.y()}
        style:--table-w={resultsTableRect.w()}
        style:--table-h={resultsTableRect.h()}>
        <div>
        {#if tableBuffer}
            {#await tableBuffer}
                <div class="empty-results">
                    Pending...
                </div>
            {:then} 
                {#if searchRequest && viewSlice && searchRequest.results.length > 0}
                    <table>
                        <thead>
                            <tr>
                            {#each Object.keys(searchRequest.results[0]) as header}
                                <th>
                                    <div class="spacer">{header}</div>
                                </th>
                            {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each { length: viewSlice.length } as _, rowIndex}
                                <tr>
                                {#each Object.values(searchRequest.results[rowIndex + viewSlice.start]) as cell}
                                    <td>
                                        <p class="hover-text">{cell}</p>
                                    </td>
                                {/each}
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {:else}
                    <div class="empty-results">
                        Nothing to see here...
                    </div>
                {/if}
            {/await}
        {/if}
        </div>

        <div>
            {#await tableBuffer then}
                {#if searchRequest && viewSlice}
                    <div>Showing {viewSlice.start}-{viewSlice.end} of {searchRequest.results.length} Results</div>
                    <div></div>
                    <div id="pagination">
                        <div id="controls">
                            <button disabled={viewSlice.start === 0} data-direction="back" onclick={cyclePage}>Prev</button>
                            <div class="seperator">|</div>
                            <button disabled={viewSlice.end >= searchRequest.results.length} data-direction="forward" onclick={cyclePage}>Next</button>
                        </div>
                        <ul id="numbers" bind:this={numbersListElement}>
                            {#if searchRequest.results.length > 0}
                                {#each { length: Math.min(Math.ceil(searchRequest.results.length / MAX_VIEW_SIZE), PAGINATION_TOTAL_PAGES) } as _, n}
                                    {#if n + (pageOffset * PAGINATION_TOTAL_PAGES) < Math.ceil(searchRequest.results.length / MAX_VIEW_SIZE)}
                                        <li><button data-focused={(Math.max(0, Math.ceil(viewSlice.end / MAX_VIEW_SIZE) - 1) === n + (pageOffset * PAGINATION_TOTAL_PAGES)) ? "" : null} data-index={n + (pageOffset * PAGINATION_TOTAL_PAGES)} id={`pageId${n + (pageOffset * PAGINATION_TOTAL_PAGES)}`} onmouseup={setPage}>{n + (pageOffset * PAGINATION_TOTAL_PAGES) + 1}</button></li>
                                    {:else}
                                        <li class="hidden"></li>
                                    {/if}
                                {/each}
                                {#if Math.ceil(searchRequest.results.length / MAX_VIEW_SIZE) > Object.keys(searchRequest.results[0]).length}
                                    <li><button id="paginationOverflow" onmouseup={cyclePagination}>...</button></li>
                                {/if}
                            {/if}
                        </ul>
                    </div>
                {/if}
            {/await}
        </div>
    </div>
</div>

<style lang="scss">
@import "$lib/style.scss";

div.root {
    background-color: $blue-1;
    width: 100vw;
    height: 100vh;

    form {
        @include rect(var(--input-x), var(--input-y), var(--input-w), var(--input-h), -50%, -50%);
        transition: top 500ms ease-in-out;
        margin: auto;
        max-width: 1500px;

        > #inputPrompt {
            @include text-center(4rem);
            width: 100%;
            background-color: transparent;
            mask-image: linear-gradient(90deg, rgba(255, 255, 255, 0.0) 0%, rgba(255, 255, 255, 1.0) 10%, rgba(255, 255, 255, 1.0) 90%, rgba(255, 255, 255, 0.0) 100%);
        }

        > #parameters {
            @include flex(space-between, start, row);
            width: 100%;
            margin-top: 1rem;
            > div, > :first-child { color: $blue-3; }
        }
    }

    > button#expandButton {
        @include rect(var(--expand-x), var(--expand-y), var(--expand-w), var(--expand-h), -50%, 0%);
        z-index: 1000;
        background-color: $blue-1;
        border: 1px solid $blue-3;
        transition: top 500ms ease-in-out;

        &:hover {
            background-color: $blue-2;
        }
    }

    > div#results {
        @include rect-bottom(var(--table-x), var(--table-y), var(--table-w), var(--table-h), -50%, 0%);

        border: 1px solid $blue-3;
        border-bottom: none;
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;

        padding: 0rem 2rem;

        background-color: $blue-1;
        box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.25);

        overflow: hidden;
        transition: height 500ms ease-in-out;

        > div:last-child {
            position: absolute;
            width: calc(100% - 4rem);
            height: 5rem;
            background: $blue-1;
            @include flex(space-between, center, row);
        }

        > div:last-child {
            bottom: 0px;
            border-top: 1px solid $blue-2;
        }

        > div:first-child {
            width: 100%;
            height: calc(100% - 7rem);
            margin: 2rem 0rem 0rem 0rem;
            padding-bottom: 1rem;
            overflow: auto;
            scroll-margin-block: 4rem;

            > .empty-results {
                @include flex(center, center, column);
                width: 100%;
                height: 100%;
            }

            table {
                table-layout: auto;
                width: 100%;
                border-collapse: collapse;

                & {
                    @keyframes fade-in {
                        0% { opacity: 0.0; }
                        100% { opacity: 1.0; }
                    }
                    animation: fade-in 500ms ease-out 1;
                }


                thead {
                    z-index: 10;
                    position: sticky;
                    top: 0px;

                    th {
                        background-color: $blue-1;
                    }

                    div.spacer {
                        border-bottom: 1px solid $blue-2;
                        padding: 2rem 0rem;
                    }
                }

                tbody {
                    border-collapse: collapse;
                    white-space: nowrap;
                    padding-top: 1rem;

                    tr {
                        border-radius: 8px;

                        &:nth-child(even) {
                            background-color: $blue-1;
                        }

                        &:nth-child(odd) {
                            background-color: $blue-2;
                        }
                    }
                }

                td {
                    position: relative;
                    padding: 1rem;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    max-width: 1px;
                    mask-image: linear-gradient(90deg, rgba(255, 255, 255, 0.0) 0%, rgba(255, 255, 255, 1.0) 2%, rgba(255, 255, 255, 1.0) 80%, rgba(255, 255, 255, 0.0) 85%);
                    overflow: hidden;

                    @keyframes inline-hover {
                        0% { transform: translateX(0%); }
                        50% { transform: translateX(-50%); }
                        100% { transform: translateX(0%); }
                    }

                    &:hover {
                        > p.hover-text {
                            animation: inline-hover 15s linear infinite;
                            animation-delay: 1s;
                        }
                    }
                }

                td:first-child {
                    border-top-left-radius: 8px;
                    border-bottom-left-radius: 8px;
                }

                td:last-child {
                    border-top-right-radius: 8px;
                    border-bottom-right-radius: 8px;
                }
            }
        }

        #pagination {
            @include flex(space-between, center, row);
            gap: 2rem;

            > #controls {
                > div.seperator {
                    display: inline-block;
                    margin: 0rem 1rem;
                }
            }

            > ul#numbers {
                @include flex(space-between, center, row);
                gap: 1rem;

                li {
                    &.hidden {
                        border: none;
                        opacity: 0.0;
                        min-width: 3em;
                    }

                    display: inline-block;
                    list-style: none;
                    > button {
                        min-width: 3em;
                    }
                }
            }
        }
    }

}
</style>
