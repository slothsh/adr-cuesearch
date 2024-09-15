export type AppendUnion<T, A> = {
    [K in keyof T]: T[K] | A;
}

export type OnlyOptional<T> = Omit<
    {
        [K in keyof T]: undefined extends T[K] ? T[K] : never;
    },
    {
        [K in keyof T]: undefined extends T[K] ? never : K
    }[keyof T]
>;

export type OnlyNonOptional<T> = Omit<
    {
        [K in keyof T]-?: undefined extends T[K] ? never : T[K];
    },
    {
        [K in keyof T]-?: undefined extends T[K] ? K : never;
    }[keyof T]
>

export function keysOf<T>(): Array<keyof T> {
    return [] as Array<keyof T>;
}

export type TypeHelper<Keys extends PropertyKey, Ts extends readonly [any, any]> = {
    [Key in Keys]: Ts[1];
};
