export class Vec2 {
    constructor(x: number = 0, y: number = 0) {
        this._x = x;
        this._y = y;
    }

    static zero(): Vec2 {
        return new Vec2();
    }

    static one(): Vec2 {
        return new Vec2(1, 1);
    }

    clone(): Vec2 {
        return new Vec2(this._x, this._y);
    }

    add(v: Vec2) {
        this._x += v._x;
        this._y += v._y;
    }

    sub(v: Vec2) {
        this._x -= v._x;
        this._y -= v._y;
    }

    mul(v: Vec2) {
        this._y *= v._y;
        this._x *= v._x;
    }

    div(v: Vec2) {
        this._y /= v._y;
        this._x /= v._x;
    }

    length(v: Vec2): Vec2 {
        return new Vec2(this._x - v._x, this._y - v._y);
    }

    dot(v: Vec2): number {
        return this._x * v._x + this._y * v._y;
    }

    get x(): number {
        return this._x;
    }

    get y(): number {
        return this._y;
    }

    get xy(): Vec2 {
        return new Vec2(this._x, this._y);
    }

    get yx(): Vec2 {
        return new Vec2(this._y, this._x);
    }

    get xx(): Vec2 {
        return new Vec2(this._x, this._x);
    }

    get yy(): Vec2 {
        return new Vec2(this._y, this._y);
    }

    set x(x: number) {
        this._x = x;
    }

    set y(y: number) {
        this._y = y;
    }

    set xy(v: Vec2) {
        this._x = v._x;
        this._y = v._y;
    }

    set yx(v: Vec2) {
        this._x= v._y;
        this._y= v._x;
    }

    set xx(v: Vec2) {
        this._x= v._x;
        this._y= v._x;
    }

    set yy(v: Vec2) {
        this._x= v._y;
        this._y= v._y;
    }

    private _x: number = $state(0.0);
    private _y: number = $state(0.0);
}
