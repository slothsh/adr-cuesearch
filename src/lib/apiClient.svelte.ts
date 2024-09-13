import { Parse, type ParametersFor } from "$lib/api.svelte";

export class ApiClient {
    constructor(urlBase: string, urlPath?: string) {
        this.baseUrl = new URL((urlPath) ? urlPath : "", urlBase);
    }

    async get<T = void>(deserialize: Parse.Deserializer<T>, queryParameters?: ParametersFor<T>): Promise<T | null> {
        const query = new URLSearchParams(<Record<string, string>>queryParameters);
        const url = new URL(`${this.baseUrl.toString()}?${query.toString()}`);
        this.lastRequest = url;

        try {
            console.log("Fetching:", url);
            const response = await fetch(url, { method: "GET", });

            if (response.ok) {
                const body = await response.text();
                const data = deserialize(body);
                return data;
            }
        } catch (error: any) {
            console.error(`could not deserialize data for GET request: ${url}`);
            return null;
        }

        console.error(`could not fetch data for GET request: ${url}`);
        return null;
    }

    baseUrl: URL;
    lastRequest: URL | null = null;
}
