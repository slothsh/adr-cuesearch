import { Vec2 } from "./vector.svelte";
import { mount, unmount, type Component as SvelteComponentInternal } from "svelte";

type Props<P> = Record<string, any> & P;
type Exports = Record<string, any>;
export type SvelteComponent<P> = SvelteComponentInternal<Props<P>, Exports, any>;

export class ComponentManager<E extends HTMLElement, P, C = SvelteComponent<P>> {
    constructor(components?: Map<E, C>) {
        if (components) {
            this.components = components;
        }
    }

    add(element: E, component: C): void {
        if (this.components.has(element)) {
            console.warn(`component with ID ${element} already exists`);
        }

        this.components.set(element, component);
    }

    mount(element: E, props?: P): void {
        const component = this.components.get(element);
        if (component) {
            // @ts-ignore
            const instance = mount(component as SvelteComponent<P>, { target: document.body, props });
            this.instances.set(element, instance);
        }
    }

    unmount(element: E): void {
        const instance = this.instances.get(element);
        if (instance) {
            unmount(instance);
            this.instances.delete(element);
        }
    }

    unmountAll(): void {
        for (const [element, instance] of this.instances) {
            unmount(instance);
            this.instances.delete(element);
        }
    }

    unmountIf(predicate?: (element: E) => boolean): void {
        const validPredicate = (predicate) ? predicate : (_: any) => true;
        const mustUnmount: Array<[E, any]> = [];

        for (const [element, instance] of this.instances) {
            if (validPredicate(element)) {
                mustUnmount.push([element, instance]);
            }
        }

        for (const [element, instance] of mustUnmount) {
            unmount(instance);
            this.instances.delete(element);
        }
    }

    dispatchEvent(eventKind: string, element: E) {
        const component = this.components.get(element);
        if (component) {
            element.dispatchEvent(new Event(eventKind));
        }
    }

    components: Map<E, C> = $state(new Map());
    private instances: Map<E, any> = $state(new Map());
}
