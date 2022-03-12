import type { DataStoreOfType } from './DataStoreOfType';

export type DataItem = {
    id: string,
    [dataField: string]: any,
}

export interface DataStore {
    exists(collection: string, id: string): Promise<boolean>;
    get<T extends DataItem>(collection: string, id: string): Promise<T>;
    find<T extends DataItem>(collection: string, filter: Partial<T>): AsyncIterable<T>;
    set<T extends DataItem>(collection: string, item: T): Promise<void>;
    delete(collection: string, id: string): Promise<void>;
    deleteBy<T extends DataItem>(collection: string, filter: Partial<T>): Promise<void>;
    deleteAll(collection: string): Promise<void>;
    deleteAll(): Promise<void>;
    ofType<T extends DataItem>(collection: string): DataStoreOfType<T>;
}

export interface DataStoreTransaction {
    //
}