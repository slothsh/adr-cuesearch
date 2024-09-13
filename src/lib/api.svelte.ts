export interface Ping {
    message: "ping",
}

export type SearchRow = {
    column1: string,
    column2: string,
    column3: string,
    column4: string,
};

export type SearchTable = Array<SearchRow>;

export interface Search {
    data: SearchTable,
}

export namespace Parse {
    export interface Deserializer<T> {
        (body: string): T | null
    }

    export function ping(body: string): Ping | null  {
        const data: Ping = JSON.parse(body);
        if (!("message" in data)) {
            console.error("response data for Ping is invalid");
            console.error(body);
        }

        return data;
    }

    export function search(body: string): Search | null  {
        const data: Search = JSON.parse(body);
        if (!("data" in data)) {
            console.error("response data for Search is invalid");
            console.error(body);
        }

        return data;
    }
}
