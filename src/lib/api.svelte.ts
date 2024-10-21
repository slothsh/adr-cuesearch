import { SvelteSet } from "svelte/reactivity";
import { Timecode, Fps } from "./timecode.svelte";

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
    __search?: never,
}

export interface SearchQueryParameters {
    line: string,
    projects?: Array<string>,
    segments?: Array<string>,
    speakers?: Array<string>,
    timeRange?: { start: Timecode, end: Timecode, toString: () => string },
    amount?: string,
}

export interface Projects {
    hash: string,
    results: SvelteSet<string>,
    __projects?: never,
}

export interface ProjectsQueryParameters {
    projects: string,
    amount?: string,
}

export interface Segments {
    hash: string,
    results: SvelteSet<string>,
    __segments?: never,
}

export interface SegmentsQueryParameters {
    segments: string,
    amount?: string,
}

export interface Speakers {
    hash: string,
    results: SvelteSet<string>,
    __speakers?: never,
}

export interface SpeakersQueryParameters {
    speakers: string,
    amount?: string,
}

type SameAs<T, U> = keyof T extends keyof U
    ? keyof U extends keyof T
        ? true
        : false
    : false;

export type ParametersFor<T> =
      SameAs<T, Ping> extends true ? PingQueryParameters
    : SameAs<T, Search> extends true ? SearchQueryParameters
    : SameAs<T, Projects> extends true ? ProjectsQueryParameters
    : SameAs<T, Segments> extends true ? SegmentsQueryParameters
    : SameAs<T, Speakers> extends true ? SpeakersQueryParameters
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

    export function projects(body: string): Projects | null  {
        const data: Projects = JSON.parse(body);
        if (!("hash" in data) || !("results" in data)) {
            console.error("response data for Projects is invalid");
            console.error(body);
            return null;
        }

        return {
            hash: data.hash,
            results: new SvelteSet(data.results),
        };
    }


    export function segments(body: string): Segments | null  {
        const data: Segments = JSON.parse(body);
        if (!("hash" in data) || !("results" in data)) {
            console.error("response data for Segments is invalid");
            console.error(body);
            return null;
        }

        return {
            hash: data.hash,
            results: new SvelteSet(data.results),
        };
    }

    export function speakers(body: string): Speakers | null  {
        const data: Speakers = JSON.parse(body);
        if (!("hash" in data) || !("results" in data)) {
            console.error("response data for Speakers is invalid");
            console.error(body);
            return null;
        }

        return {
            hash: data.hash,
            results: new SvelteSet(data.results),
        };
    }
}
