import { type AppendUnion } from "$lib/reflection";
import { Vec2 } from "./vector.svelte";

export namespace Css {
    export enum UnitKind {
        CENTIMETER = "cm",
        MILLIMETER = "mm",
        SECOND = "s",
        MILLISECOND = "ms",
        INCH = "in",
        PIXEL = "px",
        PICA = "pc",
        POINT = "pt",
        EM = "em",
        REM = "rem",
        PERCENT = "%",
        VIEWPORT_WIDTH = "vw",
        VIEWPORT_HEIGHT = "vh",
        VIEWPORT_MIN = "vmin",
        VIEWPORT_MAX = "vmax",
        EX = "ex",
        CH = "ch",
        AUTO = "auto",
    }

    export class Unit {
        constructor(value: number, unit: UnitKind) {
            this.value = value;
            this.unit = unit;
        }

        toString(): string {
            // TODO: Bounds checking based on unit
            switch (this.unit) {
                case UnitKind.AUTO: {
                    return this.unit;
                }

                default: {
                    return `${this.value}${this.unit}`;
                }
            }
        }

        private value: number;
        private unit: UnitKind;
    }

    export function cm(value: number): Unit {
        return new Unit(value, UnitKind.CENTIMETER);
    }

    export function mm(value: number): Unit {
        return new Unit(value, UnitKind.MILLIMETER);
    }

    export function sec(value: number): Unit {
        return new Unit(value, UnitKind.SECOND);
    }

    export function ms(value: number): Unit {
        return new Unit(value, UnitKind.MILLISECOND);
    }

    export function inch(value: number): Unit {
        return new Unit(value, UnitKind.INCH);
    }

    export function px(value: number): Unit {
        return new Unit(value, UnitKind.PIXEL);
    }

    export function pc(value: number): Unit {
        return new Unit(value, UnitKind.PICA);
    }

    export function pt(value: number): Unit {
        return new Unit(value, UnitKind.POINT);
    }

    export function em(value: number): Unit {
        return new Unit(value, UnitKind.EM);
    }

    export function rem(value: number): Unit {
        return new Unit(value, UnitKind.REM);
    }

    export function percent(value: number): Unit {
        return new Unit(value, UnitKind.PERCENT);
    }

    export function vw(value: number): Unit {
        return new Unit(value, UnitKind.VIEWPORT_WIDTH);
    }

    export function vh(value: number): Unit {
        return new Unit(value, UnitKind.VIEWPORT_HEIGHT);
    }

    export function vmin(value: number): Unit {
        return new Unit(value, UnitKind.VIEWPORT_MIN);
    }

    export function vmax(value: number): Unit {
        return new Unit(value, UnitKind.VIEWPORT_MAX);
    }

    export function ex(value: number): Unit {
        return new Unit(value, UnitKind.EX);
    }

    export function ch(value: number): Unit {
        return new Unit(value, UnitKind.CH);
    }

    export function calc(formatString: string, ...values: Array<Unit>): string {
        // TODO: Check that format string has enough placeholders
        //
        let expressionString = formatString;
        for (const unitValue of values) {
            expressionString = expressionString.replace("{}", unitValue.toString());
        }

        return `calc(${expressionString})`;
    }

    export function variable(identifier: string): string {
        return `var(--${identifier})`;
    }

    export function scalar(value: number): string {
        return `${value}`;
    }

export function toKebabCase(camelCase: string): string {
    return (camelCase[0].toLowerCase() + camelCase.slice(1))
        .replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

export interface CssStyleConfig extends Partial<AppendUnion<CSSStyleDeclaration, Unit>> {
    [key: string]: any,
}

export function cssStyleString(styles: CssStyleConfig): string {
    let styleString = "";
    for (const key of Object.keys(styles)) {
        // @ts-ignore
        const styleValue = styles[key];
        const styleKey = (!key.startsWith("--"))
            ? toKebabCase(key)
            : key;

        if (typeof styleValue === "string") {
            styleString += `${styleKey}: ${styleValue};`;
        } else if (typeof styleValue === "number") {
            styleString += `${styleKey}: ${styleValue.toString()};`;
        } else if (typeof styleValue === "boolean") {
            styleString += `${styleKey}: ${styleValue.toString()};`;
        } else if (styleValue.constructor.name === "CssUnitValue") {
            styleString += `${styleKey}: ${styleValue.toString()};`;
        } else if (typeof styleValue === "object" && styleValue !== null) {
            styleString += cssStyleString(styleValue);
        } else {
            return "";
        }
    }

    return styleString;
}

    export class CssVec2 {
        constructor(v: Vec2, unitX: Css.UnitKind = Css.UnitKind.PIXEL, unitY: Css.UnitKind = Css.UnitKind.PIXEL) {
            this.v = v;
            this.unitX = unitX;
            this.unitY = unitY;
        }

        x(): string { return new Css.Unit(this.v.x, this.unitX).toString(); }
        y(): string { return new Css.Unit(this.v.y, this.unitY).toString(); }

        unitX: Css.UnitKind = Css.UnitKind.PIXEL;
        unitY: Css.UnitKind = Css.UnitKind.PIXEL;
        v: Vec2;
    }

    type CssRectPositionOptions = { v: Vec2, unitX: UnitKind, unitY: UnitKind };
    type CssRectDimensionsOptions = { v: Vec2, unitW: UnitKind, unitH: UnitKind };

    export class CssRect {
        constructor(position?: CssRectPositionOptions, dimensions?: CssRectDimensionsOptions) {
            if (position) {
                this.position = position.v;
                this.unitX = position.unitX;
                this.unitY = position.unitY;
            } else {
                this.position = new Vec2();
            }

            if (dimensions) {
                this.dimensions = dimensions.v;
                this.unitW = dimensions.unitW;
                this.unitH = dimensions.unitH;
            } else {
                this.dimensions = new Vec2();
            }
        }

        y(): string { return new Css.Unit(this.position.y, this.unitY).toString(); }
        x(): string { return new Css.Unit(this.position.x, this.unitX).toString(); }
        w(): string { return new Css.Unit(this.dimensions.x, this.unitW).toString(); }
        h(): string { return new Css.Unit(this.dimensions.y, this.unitH).toString(); }

        clone(): CssRect {
            return new CssRect(
                { v: this.position, unitX: this.unitX, unitY: this.unitY },
                { v: this.dimensions, unitW: this.unitW, unitH: this.unitH },
            );
        }

        unitX: Css.UnitKind = $state(Css.UnitKind.PIXEL);
        unitY: Css.UnitKind = $state(Css.UnitKind.PIXEL);
        unitW: Css.UnitKind = $state(Css.UnitKind.PIXEL);
        unitH: Css.UnitKind = $state(Css.UnitKind.PIXEL);

        position: Vec2;
        dimensions: Vec2;
    }
}
