<script module lang="ts">
import { type Snippet } from "svelte";
import { Css } from "./css.svelte";
import { Vec2 } from "./vector.svelte";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

export interface Props {
    manager: MenuManager,
    searchSelect: Snippet<[Menu]>,
    searchTimeRange: Snippet<[Menu]>,
}

export interface Menu {
    kind: MenuKind,
    rect: Css.CssRect,
    enabled: boolean,
    id: number,
    data?: SvelteSet<string>,
}

export const enum MenuKind {
    EMPTY = -1,
    SEARCH_SELECT,
    SEARCH_TIME_RANGE,
}

export class MenuManager {
    constructor(menus?: SvelteSet<HTMLElement>) {
        if (menus) {
            for (const menu of menus) {
                this.menus.set(menu, { id: -1, rect: new Css.CssRect(), enabled: false, kind: MenuKind.EMPTY });
            }
        }
    }

    add(element: HTMLElement, menu?: Menu): void {
        if (this.menus.has(element)) {
            console.warn(`menu with ID ${element} already exists`);
        }

        if (menu) {
            this.menus.set(element, menu);
        } else {
            this.menus.set(element, { id: -1, kind: MenuKind.EMPTY, enabled: false, rect: new Css.CssRect() });
        }
    }

    remove(element: HTMLElement): void {
        const removed = this.menus.delete(element);
        if (!removed) {
            console.warn(`menu with ID ${element} does not exist, no deletion occurred`);
        }
    }

    get(element: HTMLElement): Menu | null {
        const menu = this.menus.get(element);
        if (menu) { return menu; }
        return null;
    }

    enable(element: HTMLElement): void {
        const menu = this.menus.get(element);
        if (menu) {
            this.menus.set(element, {
                id: menu.id,
                kind: menu.kind,
                enabled: true,
                rect: this.defaultRect(element),
                data: menu.data,
            });
        }
    }

    toggleGreedy(element: HTMLElement): void {
        const menu = this.menus.get(element);
        if (menu) {
            this.menus.set(element, {
                id: menu.id,
                kind: menu.kind,
                enabled: !menu.enabled,
                rect: this.defaultRect(element),
                data: menu.data,
            });
        }

        this.disableIf((otherElement) => element !== otherElement); 
    }

    enableAll(callback?: (element: HTMLElement, menu: Menu) => void): void {
        for (const [element, menu] of this.menus) {
            if (callback) callback(element, menu);
            this.menus.set(element, {
                id: menu.id,
                kind: menu.kind,
                enabled: true,
                rect: this.defaultRect(element),
                data: menu.data,
            });
        }
    }

    enableIf(predicate?: (element: HTMLElement, menu: Menu) => boolean): void {
        const validPredicate = (predicate) ? predicate : (_: any) => true;
        const mustEnable: Array<[HTMLElement, Menu]> = [];

        for (const [element, menu] of this.menus) {
            if (validPredicate(element, menu)) {
                mustEnable.push([element, menu]);
            }
        }

        for (const [enableElement, menu] of mustEnable) {
            this.menus.set(enableElement, {
                id: menu.id,
                kind: menu.kind,
                enabled: true,
                rect: this.defaultRect(enableElement),
                data: menu.data,
            });
        }
    }

    disable(element: HTMLElement): void {
        const menu = this.menus.get(element);
        if (menu) {
            this.menus.set(element, {
                id: menu.id,
                kind: menu.kind,
                enabled: false,
                rect: this.defaultRect(element),
                data: menu.data,
            });
        }
    }

    disableAll(callback?: (element: HTMLElement, menu: Menu) => void): void {
        for (const [element, menu] of this.menus) {
            if (callback) callback(element, menu);
            this.menus.set(element, {
                id: menu.id,
                kind: menu.kind,
                enabled: false,
                rect: this.defaultRect(element),
                data: menu.data,
            });
        }
    }

    disableIf(predicate?: (element: HTMLElement, menu: Menu) => boolean): void {
        const validPredicate = (predicate) ? predicate : (_: any) => true;
        const mustDisable: Array<[HTMLElement, Menu]> = [];

        for (const [element, menu] of this.menus) {
            if (validPredicate(element, menu)) {
                mustDisable.push([element, menu]);
            }
        }

        for (const [disableElement, menu] of mustDisable) {
            menu.enabled = false;
            this.menus.set(disableElement, {
                id: menu.id,
                kind: menu.kind,
                enabled: false,
                rect: this.defaultRect(disableElement),
                data: menu.data,
            });
        }
    }

    setData(element: HTMLElement, data: SvelteSet<string>): void {
        const menu = this.menus.get(element);
        if (menu) {
            this.menus.set(element, {
                id: menu.id,
                kind: menu.kind,
                enabled: menu.enabled,
                rect: this.defaultRect(element),
                data: data,
            });
        }
    }

    private readonly DEFAULT_RECT_WIDTH = 420;
    private readonly DEFAULT_RECT_HEIGHT = 420;
    private defaultRect(element: HTMLElement) {
        const elementRect = element.getBoundingClientRect();
        return new Css.CssRect(
            {
                v: new Vec2(elementRect.x - (this.DEFAULT_RECT_WIDTH/2 - elementRect.width/2), elementRect.y + elementRect.height),
                unitX: Css.UnitKind.PIXEL,
                unitY: Css.UnitKind.PIXEL,
            },
            {
                v: new Vec2(this.DEFAULT_RECT_WIDTH, this.DEFAULT_RECT_HEIGHT),
                unitW: Css.UnitKind.PIXEL,
                unitH: Css.UnitKind.AUTO,
            },
        )
    }

    clear(): void {
        this.menus.clear();
    }
    
    clearData(element: HTMLElement): void {
        const menu = this.menus.get(element);
        console.log(menu);
        if (menu && menu.data) {
            menu.data.clear();
        }
    }

    menus: Map<HTMLElement, Menu> = $state(new SvelteMap());
}
</script>

<script lang="ts">
let {
    manager,
    searchSelect,
    searchTimeRange,
}: Props = $props();
</script>

{#each manager.menus.keys() as element}
    {@const menu = manager.get(element)!}
    {#if menu.kind === MenuKind.SEARCH_SELECT}
        {#if menu.enabled}
            {@render searchSelect(menu)}
        {/if}
    {:else if menu.kind === MenuKind.SEARCH_TIME_RANGE}
        {#if menu.enabled}
            {@render searchTimeRange(menu)}
        {/if}
    {/if}
{/each}
