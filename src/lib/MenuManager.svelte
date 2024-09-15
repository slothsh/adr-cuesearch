<script module lang="ts">
import { type Snippet } from "svelte";
import { Css } from "./css.svelte";
import { Vec2 } from "./vector.svelte";

export interface Props {
    manager: MenuManager,
    searchSelect: Snippet<[Menu, Set<string>]>,
}

export interface Menu {
    kind: MenuKind,
    rect: Css.CssRect,
    enabled: boolean,
}

export const enum MenuKind {
    EMPTY = -1,
    SEARCH_SELECT,
}

export class MenuManager {
    constructor(menus?: Set<HTMLElement>) {
        if (menus) {
            for (const menu of menus) {
                this.menus.set(menu, { rect: new Css.CssRect(), enabled: false, kind: MenuKind.EMPTY });
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
            this.menus.set(element, { kind: MenuKind.EMPTY, enabled: false, rect: new Css.CssRect() });
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
            const elementRect = element.getBoundingClientRect();
            menu.enabled = true;

            // TODO: default menu sizes
            menu.rect = new Css.CssRect(
                {
                    v: new Vec2(elementRect.x - (160 - elementRect.width/2), elementRect.y + elementRect.height),
                    unitX: Css.UnitKind.PIXEL,
                    unitY: Css.UnitKind.PIXEL,
                },
                {
                    v: new Vec2(320, 320),
                    unitH: Css.UnitKind.PIXEL,
                    unitW: Css.UnitKind.PIXEL,
                },
            );

            this.tick();
        }
    }

    toggleGreedy(element: HTMLElement): void {
        const menu = this.menus.get(element);
        if (menu) {
            menu.enabled = !menu.enabled;
            this.updateRect(element, menu);
            this.tick();
        }

        this.disableIf((otherElement) => element !== otherElement); 
    }

    enableAll(callback?: (element: HTMLElement, menu: Menu) => void): void {
        for (const [element, menu] of this.menus) {
            if (callback) callback(element, menu);
            menu.enabled = true;
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

        for (const [_, menu] of mustEnable) {
            menu.enabled = true;
        }
    }

    disable(element: HTMLElement): void {
        const menu = this.menus.get(element);
        if (menu) { menu.enabled = false; }
    }

    disableAll(callback?: (element: HTMLElement, menu: Menu) => void): void {
        for (const [element, menu] of this.menus) {
            if (callback) callback(element, menu);
            menu.enabled = false;
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

        for (const [element, menu] of mustDisable) {
            menu.enabled = false;
        }

        this.tick();
    }

    setRect(element: HTMLElement, rect: Css.CssRect) {
        this.setPosition(element, new Css.CssVec2(rect.position, rect.unitX, rect.unitY));
        this.setDimensions(element, new Css.CssVec2(rect.dimensions, rect.unitW, rect.unitH));
    }

    setPosition(element: HTMLElement, position: Css.CssVec2) {
        const menu = this.menus.get(element);
        if (menu) {
            menu.rect.position = position.v;
            menu.rect.unitX = position.unitX;
            menu.rect.unitY = position.unitY;
        } else {
            console.warn(`could not set position, element does not contain any associated menus, ${element}`);
        }
    }

    setDimensions(element: HTMLElement, dimensions: Css.CssVec2) {
        const menu = this.menus.get(element);
        if (menu) {
            menu.rect.dimensions = dimensions.v;
            menu.rect.unitW = dimensions.unitX;
            menu.rect.unitH = dimensions.unitY;
        } else {
            console.warn(`could not set dimensions, element does not contain any associated menus, ${element}`);
        }
    }

    updateRect(element: HTMLElement, menu: Menu) {
        const elementRect = element.getBoundingClientRect();
        menu.rect = new Css.CssRect(
            {
                v: new Vec2(elementRect.x - (160 - elementRect.width/2), elementRect.y + elementRect.height),
                unitX: Css.UnitKind.PIXEL,
                unitY: Css.UnitKind.PIXEL,
            },
            {
                v: new Vec2(320, 320),
                unitH: Css.UnitKind.PIXEL,
                unitW: Css.UnitKind.PIXEL,
            },
        );
    }

    tick(): void {
        this._tick = !this._tick;
    }

    menus: Map<HTMLElement, Menu> = $state(new Map());
    private _tick = $state(false);
}
</script>

<script lang="ts">
let {
    manager,
    searchSelect,
}: Props = $props();

// @ts-ignore
let tick = $derived(manager._tick);
</script>

{#key tick}
{#each manager.menus.keys() as element}
    {@const menu = manager.get(element)!}
    {#if menu.kind === MenuKind.SEARCH_SELECT}
        {#if menu.enabled}
            {@render searchSelect(menu, new Set(["one", "two", "three"]))}
        {/if}
    {/if}
{/each}
{/key}

<style lang="scss">
</style>
