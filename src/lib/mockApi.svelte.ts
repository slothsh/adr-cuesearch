export class MockApi<T> {
    constructor() {}

    async pushRequest(result: T, delay: number = MockApi.DELAY): Promise<T> {
        return new Promise(
            (res, rej) => {
                const id = setTimeout(() => {
                    res(result);
                }, delay);

                this.pending.push(id);
            },
        );
    }

    static readonly DELAY: number = 1000;

    pending: Array<number> = $state([]);
}
