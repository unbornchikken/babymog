export class MapEx<K, V> extends Map<K, V> {
    async getOrCreate(key: K, factory: () => Promise<V>) {
        let item = this.get(key);
        if (item === undefined) {
            item = await factory();
            this.set(key, item);
        }
        return item;
    }

    getOrCreateSync(key: K, factory: () => V) {
        let item = this.get(key);
        if (item === undefined) {
            item = factory();
            this.set(key, item);
        }
        return item;
    }

    async tryGetOrCreate(key: K, factory: () => Promise<V | undefined>) {
        let item = this.get(key);
        if (item === undefined) {
            item = await factory();
            if (item !== undefined) {
                this.set(key, item);
            }
        }
        return item;
    }

    tryGetOrCreateSync(key: K, factory: () => V | undefined) {
        let item = this.get(key);
        if (item === undefined) {
            item = factory();
            if (item !== undefined) {
                this.set(key, item);
            }
        }
        return item;
    }

    append(other: Map<K, V>) {
        for (const [key, value] of other.entries()) {
            this.set(key, value);
        }
    }

    static groupBy<K, V>(items: Iterable<V>, keySelectorFn: (item: V) => K | undefined) {
        const result = new MapEx<K, V[]>();
        for (const item of items) {
            const key = keySelectorFn(item);
            if (key !== undefined) {
                const group = result.getOrCreateSync(key, () => []);
                group.push(item);
            }
        }
        return result;
    }

    static fromObject(obj: any) {
        const map = new MapEx<string, any>();
        for (const key of Object.keys(obj)) {
            map.set(key, obj[key]);
        }
        return map;
    }

    toObject() {
        const obj: any = {};
        for (const [key, value] of this.entries()) {
            obj[key] = value;
        }
        return obj;
    }

    intoObject(obj: any) {
        const keys = new Set(Object.keys(obj));
        for (const [key, value] of this.entries()) {
            obj[key] = value;
            keys.delete(String(key));
        }
        for (const remainingKey of keys) {
            delete obj[remainingKey];
        }
        return obj;
    }
}