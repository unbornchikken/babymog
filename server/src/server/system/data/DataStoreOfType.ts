import type { DataItem, DataStore } from './DataStore';

export class DataStoreOfType<T extends DataItem> {
    constructor(store: DataStore, collection: string) {
        this.store = store;
        this.collection = collection;
    }

    private readonly store: DataStore;
    private readonly collection: string;

    async exists(id: string) {
        return await this.store.exists(this.collection, id);
    }

    async get(id: string) {
        return await this.store.get<T>(this.collection, id);
    }

    async* find(filter: Partial<T>) {
        yield* this.store.find(this.collection, filter);
    }

    async set(item: T): Promise<void> {
        await this.store.set(this.collection, item);
    }

    async delete(id: string): Promise<void> {
        await this.store.delete(this.collection, id);
    }

    async deleteBy(filter: Partial<T>): Promise<void> {
        await this.store.deleteBy(this.collection, filter);
    }

    async deleteAll(): Promise<void> {
        await this.store.deleteAll(this.collection);
    }
}