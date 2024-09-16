<script lang="ts">
import MenuManagerView, { MenuManager, MenuKind as MenuManagerKind } from "$lib/MenuManager.svelte";
import MenuSearchSelect from "$lib/MenuSearchSelect.svelte";
import { ApiClient } from "$lib/apiClient.svelte";
import { Css } from "$lib/css.svelte";
import { DropdownMenuId } from "$lib/app.svelte";
import { Vec2 } from "$lib/vector.svelte";
import { onMount } from "svelte";
import { SvelteSet } from "svelte/reactivity";
import { type Search, type Projects, type Segments, type Speakers, Parse as ApiParse, columnDisplayName } from "$lib/api.svelte";
import { type SearchQueryParameters } from "$lib/api.svelte";
import CheckBox from "$lib/CheckBox.svelte";

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
const SEARCH_CLIENT = $state(new ApiClient("http://localhost:6969/", "search"));
const PAGINATION_TOTAL_PAGES = 4;
const SEARCH_DEBOUNCE_DELAY = 1000.0;
const MENU_MANAGER: MenuManager = new MenuManager();

let searchRequest: Search | null = $state(null);
let tableBuffer: Promise<Search | null> | null = $state(null);
let viewSlice: ViewSlice | null = $state(null);
let toggled = $state(false);
let numbersListElement: HTMLUListElement | null = $state(null);
let pageOffset = $state(0);
let debounceSearchLast = $state(performance.now());
let debounceId = $state(-1);

let projectsRequest: Projects = $state({ hash: "", results: new SvelteSet<string>() });
let projectsBuffer: Promise<Projects | null> | null = $state(null);
let pinnedProjects = $state(new SvelteSet<string>());

let segmentsRequest: Segments = $state({ hash: "", results: new SvelteSet<string>() });
let segmentsBuffer: Promise<Segments | null> | null = $state(null);
let pinnedSegments = $state(new SvelteSet<string>());

let speakersRequest: Speakers = $state({ hash: "", results: new SvelteSet<string>() });
let speakersBuffer: Promise<Speakers | null> | null = $state(null);
let pinnedSpeakers = $state(new SvelteSet<string>());

function handleSelectedParameter(event: MouseEvent, dataId: number) {
    const inputEvent =  event as MouseEvent & { currentTarget: EventTarget & HTMLInputElement, target: EventTarget & HTMLInputElement };
    let buttonElement = inputEvent.target.closest("li")?.querySelector("[data-value]");

    if (buttonElement) {
        let pinned = null;
        switch (dataId) {
            case DropdownMenuId.PROJECT_SELECT: { pinned = pinnedProjects; } break;
            case DropdownMenuId.SEGMENT_SELECT: { pinned = pinnedSegments; } break;
            case DropdownMenuId.SPEAKER_SELECT: { pinned = pinnedSpeakers; } break;

            case DropdownMenuId.TIMERANGE_SELECT: { console.warn("not implemented"); }
            default: return;
        }

        if (pinned) {
            const value = buttonElement.getAttribute("data-value");
            if (value && pinnedProjects.has(value)) {
                pinned.delete(value);
            } else if (value) {
                pinned.add(value);
            }
        }
    }
}

function pinnedContains(id: number, value: string): boolean {
    switch (id) {
        case DropdownMenuId.PROJECT_SELECT: return pinnedProjects.has(value);
        case DropdownMenuId.SEGMENT_SELECT: return pinnedSegments.has(value);
        case DropdownMenuId.SPEAKER_SELECT: return pinnedSpeakers.has(value);

        case DropdownMenuId.TIMERANGE_SELECT: { console.warn("not implemented"); }
        default: return false;
    }
}

onMount(() => {
    const elements = document.querySelectorAll("[data-id]");
    for (const element of elements) {
        if (element) {
            const dataId = parseInt(element.getAttribute("data-id")!);
            MENU_MANAGER.add(element as HTMLElement, { id: dataId, kind: MenuManagerKind.SEARCH_SELECT, enabled: false, rect: new Css.CssRect() });
        }
    }
});

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

async function hex(value: string) {
    const hashBuffer = await window.crypto.subtle.digest("SHA-1", TEXT_ENCODER.encode(value));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""); 
}

function handleSearch(event: Event) {
    if (debounceId !== -1) { clearTimeout(debounceId); }

    debounceId = setTimeout(async (event: PromptEvent) => {
        const debounceSearchNow = performance.now();
        if ((debounceSearchNow - debounceSearchLast) >= SEARCH_DEBOUNCE_DELAY) {
            if (event.target && event.target.value !== "") {
                const hash = await hex(event.target.value);

                if (searchRequest && hash === searchRequest.hash) {
                    console.warn("not implemented");
                } else {
                    const queryParameters: SearchQueryParameters = {
                        amount: "100",
                        line: (event.target) ? event.target.value : "",
                        projects: Array.from(pinnedProjects),
                        segments: Array.from(pinnedSegments),
                        speakers: Array.from(pinnedSpeakers),
                    };

                    console.log(queryParameters);

                    tableBuffer = SEARCH_CLIENT.get(ApiParse.search, queryParameters);
                    tableBuffer.then(async (payload) => {
                        if (payload === null) return;

                        if (searchRequest !== null && payload.hash === searchRequest.hash) {
                            // TODO: Fetch from cached
                            console.warn("same query, ignoring...", payload.hash, searchRequest.hash);
                        } else {
                            viewSlice = null;
                            searchRequest = {
                                hash: payload.hash,
                                results: payload.results,
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

            }

            debounceSearchLast = debounceSearchNow;
        }
    }, SEARCH_DEBOUNCE_DELAY, event);
}

function handleParameterSearch(event: Event) {
    if (debounceId !== -1) { clearTimeout(debounceId); }

    debounceId = setTimeout(async (event: PromptEvent) => {
        const debounceSearchNow = performance.now();
        if ((debounceSearchNow - debounceSearchLast) < SEARCH_DEBOUNCE_DELAY) return;
        debounceSearchLast = debounceSearchNow;

        if (!event.target) return;
        const hash = await hex(event.target.value);
        const dataId = parseInt(event.target.closest("[data-id]")?.getAttribute("data-id")!);

        switch (dataId) {
            case DropdownMenuId.PROJECT_SELECT: {
                const target = document.querySelector(`#parameters>[data-id="${DropdownMenuId.PROJECT_SELECT}"]`);
                if (target && event.target.value === "") {
                    projectsRequest.results.clear();
                    MENU_MANAGER.setData(target as HTMLElement, pinnedProjects);
                    return;
                }

                if (projectsRequest && hash === projectsRequest.hash) {
                    console.warn("not implemented");
                } else {
                    projectsBuffer = SEARCH_CLIENT.get(ApiParse.projects, { amount: "100", projects: (event.target) ? event.target.value : "" } );
                    projectsBuffer.then(async (payload) => {
                        if (payload === null) return;

                        if (projectsRequest !== null && payload.hash === projectsRequest.hash) {
                            // TODO: Fetch from cached
                            console.warn("same query, ignoring...", payload.hash, projectsRequest.hash);
                        } else {
                            if (target) {
                                let tmp = pinnedProjects.union(payload.results);
                                MENU_MANAGER.setData(target as HTMLElement, new SvelteSet(tmp));
                                projectsRequest = {
                                    hash: payload.hash,
                                    results: payload.results,
                                };
                            }
                        }
                    });
                }
            } break;

            case DropdownMenuId.SEGMENT_SELECT: {
                const target = document.querySelector(`#parameters>[data-id="${DropdownMenuId.SEGMENT_SELECT}"]`);
                if (target && event.target.value === "") {
                    segmentsRequest.results.clear();
                    MENU_MANAGER.setData(target as HTMLElement, pinnedSegments);
                    return;
                }

                if (segmentsRequest && hash === segmentsRequest.hash) {
                    console.warn("not implemented");
                } else {
                    segmentsBuffer = SEARCH_CLIENT.get(ApiParse.segments, { amount: "100", segments: (event.target) ? event.target.value : "" } );
                    segmentsBuffer.then(async (payload) => {
                        if (payload === null) return;

                        if (segmentsRequest !== null && payload.hash === segmentsRequest.hash) {
                            // TODO: Fetch from cached
                            console.warn("same query, ignoring...", payload.hash, segmentsRequest.hash);
                        } else {
                            if (target) {
                                let tmp = pinnedSegments.union(payload.results);
                                MENU_MANAGER.setData(target as HTMLElement, new SvelteSet(tmp));
                                segmentsRequest = {
                                    hash: payload.hash,
                                    results: payload.results,
                                };
                            }
                        }
                    });
                }
            } break;

            case DropdownMenuId.SPEAKER_SELECT: {
                const target = document.querySelector(`#parameters>[data-id="${DropdownMenuId.SPEAKER_SELECT}"]`);
                if (target && event.target.value === "") {
                    speakersRequest.results.clear();
                    MENU_MANAGER.setData(target as HTMLElement, pinnedSpeakers);
                    return;
                }

                if (speakersRequest && hash === speakersRequest.hash) {
                    console.warn("not implemented");
                } else {
                    speakersBuffer = SEARCH_CLIENT.get(ApiParse.speakers, { amount: "100", speakers: (event.target) ? event.target.value : "" } );
                    speakersBuffer.then(async (payload) => {
                        if (payload === null) return;

                        if (speakersRequest !== null && payload.hash === speakersRequest.hash) {
                            // TODO: Fetch from cached
                            console.warn("same query, ignoring...", payload.hash, speakersRequest.hash);
                        } else {
                            if (target) {
                                let tmp = pinnedSpeakers.union(payload.results);
                                MENU_MANAGER.setData(target as HTMLElement, new SvelteSet(tmp));
                                speakersRequest = {
                                    hash: payload.hash,
                                    results: payload.results,
                                };
                            }
                        }
                    });
                }
            } break;

            case DropdownMenuId.TIMERANGE_SELECT: { console.warn("not implemented"); } break;

            default: {} break;
        }
    }, SEARCH_DEBOUNCE_DELAY, event);
}

function shouldAnimateOnHover(_: string): boolean {
    return true;
}

function preventDefault<E extends Event>(fn: (event: E) => void) {
    return function (event: Event) {
        event.preventDefault();
        // @ts-ignore
        fn.call(this, event);
    }
}

function handleDropDownMenu(event: MouseEvent & { target: EventTarget & HTMLDivElement }) {
    const target = event.target.closest("[data-id]") as HTMLElement;
    if (target) {
        MENU_MANAGER.toggleGreedy(target);
    }
}

function handleDocumentClick(event: Event): void {
    MENU_MANAGER.disableIf((element, _) => {
        const eventRoot = (event.target as HTMLElement).closest("[data-id]");
        const eventDataId = eventRoot?.getAttribute("data-id");
        const targetDataId = element.getAttribute("data-id");

        if (eventDataId && targetDataId) {
            if (eventDataId !== targetDataId) {
                element.removeAttribute("opened");
                return true;
            } else {
                if (element === eventRoot) {
                    element.toggleAttribute("opened");
                }
                return false;
            }
        }

        element.removeAttribute("opened");
        return true;
    });
}

function handleWindowResize(_: Event): void {
    MENU_MANAGER.disableAll((element) => {
        element.removeAttribute("opened");
    });
}
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
</svelte:head>

<svelte:document onclick={handleDocumentClick}></svelte:document>
<svelte:window onresize={handleWindowResize}></svelte:window>

{#snippet closeButton(pinned: SvelteSet<string>)}
    {#if pinned.size > 0}
        <button class="close" onclick={() => { pinned.clear(); }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="0.75em" height="1em" viewBox="0 0 384 512"><path fill="currentColor" d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7L86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256L41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3l105.4 105.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256z"/></svg>
        </button>
    {/if}
{/snippet}

<div class="root">
    <form action="javascript:void(0);"
        style:--input-x={promptRect.x()}
        style:--input-y={promptRect.y()}
        style:--input-w={promptRect.w()}
        style:--input-h={promptRect.h()}>
        <input
            type="text"
            id="inputPrompt"
            name="query"
            placeholder="Start typing to search..."
            autocomplete="off"
            oninput={handleSearch}>

        <div id="parameters">
            <h2 style="align-self: center;">Search Parameters</h2>
            <div id="projects" data-id={DropdownMenuId.PROJECT_SELECT}>
                <button onclick={preventDefault(handleDropDownMenu)}>
                    <big>Projects:</big>
                    <small>
                        {pinnedProjects.size} Selected
                    </small>
                </button>
                {@render closeButton(pinnedProjects)}
            </div>
            <div id="segments" data-id={DropdownMenuId.SEGMENT_SELECT}>
                <button onclick={preventDefault(handleDropDownMenu)}>
                    <big>Segments:</big>
                    <small>
                        {pinnedSegments.size} Selected
                    </small>
                    {@render closeButton(pinnedSegments)}
                </button>
            </div>
            <div id="speakers" data-id={DropdownMenuId.SPEAKER_SELECT}>
                <button onclick={preventDefault(handleDropDownMenu)}>
                    <big>Speakers:</big>
                    <small>
                        {pinnedSpeakers.size} Selected
                    </small>
                    {@render closeButton(pinnedSpeakers)}
                </button>
            </div>
            <div data-id={DropdownMenuId.TIMERANGE_SELECT} id="timeRange">
                <button onclick={preventDefault(handleDropDownMenu)}>
                    <bold style:font-weight="bold" data-part="start" data-value="00:00:00:00">00:00:00:00</bold>
                    <small>to</small>
                    <bold style:font-weight="bold" data-part="end" data-value="00:00:00:00">00:00:00:00</bold>
                </button>
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
                            {#each searchRequest.results[0] as header, n}
                                <th>
                                    <div class="spacer">{columnDisplayName(header.kind) ? columnDisplayName(header.kind) : `Column${n}`}</div>
                                </th>
                            {/each}
                            </tr>
                        </thead>
                        <tbody>
                            {#each { length: viewSlice.length } as _, rowIndex}
                                <tr>
                                {#each searchRequest.results[rowIndex + viewSlice.start] as cell}
                                    <td>
                                        <p class:hover-text={() => shouldAnimateOnHover(cell.value)}>{cell.value}</p>
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

<MenuManagerView manager={MENU_MANAGER}>
    {#snippet searchSelect(menu)}
        <MenuSearchSelect dataId={menu.id} target={menu.rect} data={menu.data} onclick={(event) => handleSelectedParameter(event as MouseEvent, menu.id)} oninput={handleParameterSearch}>
            {#snippet listItem(value: string)}
                <div class="checkbox">
                    <CheckBox checked={pinnedContains(menu.id, value)} {value} oninput={(event) => handleSelectedParameter(event as MouseEvent, menu.id)} />
                    <big>{value}</big>
                </div>
            {/snippet}

            {#snippet empty()}
                <div>Start typing to search...</div>
            {/snippet}
        </MenuSearchSelect>
    {/snippet}
</MenuManagerView>

<style lang="scss">
@import "$lib/style.scss";

div.checkbox {
    @include flex(start, center, row);
    gap: 1rem;
}

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

            big {
                font-size: 1.25rem;
                font-weight: bold;
                margin-right: 1rem;
            }

            > button, > div, > :first-child { color: $blue-3; }

            > button, > div {
                @include button-style(1px solid transparent);
                padding: 0.25rem 0.5rem 0.25rem 0.5rem;
                align-self: center;

                > button:not(.close) {
                    border: none;
                }

                > button.close:last-child {
                    padding: 0.25rem 0.4rem;
                    margin-left: 1rem;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;

                    &:hover {
                        border-color: $blue-2;
                        background-color: $blue-3;

                        * {
                            background-color: $blue-3;
                        }
                    }
                }
            }
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
                    @include keyframes-fade();
                    animation: fade 500ms ease-out 1;
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
