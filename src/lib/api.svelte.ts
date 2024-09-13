export interface Ping {
    message: "ping",
}

export interface PingQueryParameters {
    q: "ping",
}

export const enum ColumnKind {
    PROD = 0,
    SEGMENT,
    TC_IN,
    TC_OUT,
    SPEAKER,
    LINE,
}

export function columnDisplayName(kind: ColumnKind): string | null {
    switch (kind) {
        case ColumnKind.PROD: return "Prod. ID";
        case ColumnKind.SEGMENT: return "Segment";
        case ColumnKind.TC_IN: return "TC In";
        case ColumnKind.TC_OUT: return "TC Out";
        case ColumnKind.SPEAKER: return "Speaker";
        case ColumnKind.LINE: return "Line";
        default: return null;
    }
}

export type SearchColumn = {
    value: string,
    kind: ColumnKind,
};

export type SearchRow = Array<SearchColumn>;

export type SearchTable = Array<SearchRow>;

export interface Search {
    hash: string,
    results: SearchTable,
}

export interface SearchQueryParameters {
    q: string,
    amount?: string,
}

type SameAs<T, U> =
      keyof T extends keyof U ? keyof U extends keyof T
        ? true
        : false
    : false;

export type ParametersFor<T> =
      SameAs<T, Ping> extends true   ? PingQueryParameters
    : SameAs<T, Search> extends true ? SearchQueryParameters
    : Record<string, string>;

export namespace Parse {
    export interface Deserializer<T> {
        (body: string): T | null
    }

    export function ping(body: string): Ping | null  {
        const data: Ping = JSON.parse(body);
        if (!("message" in data)) {
            console.error("response data for Ping is invalid");
            console.error(body);
            return null;
        }

        return data;
    }

    export function search(body: string): Search | null  {
        const data: Search = JSON.parse(body);
        if (!("hash" in data) || !("results" in data)) {
            console.error("response data for Search is invalid");
            console.error(body);
            return null;
        }

        return data;
    }
}
