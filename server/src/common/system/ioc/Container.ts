import assert from 'assert';

type ServiceFactoryFn<T> = (c: Container) => T;

type Entry = {
    service?: unknown,
    factory?: ServiceFactoryFn<unknown>,
};

export class Container {
    private services: Map<string, Entry> = new Map();

    register<T>(name: string, serviceFactoryFn: ServiceFactoryFn<T>) {
        name = name.toLowerCase();
        assert(!this.services.has(name), `Service "${name}" already exists.`);
        this.services.set(name, { factory: serviceFactoryFn });
    }

    get<T>(name: string) {
        name = name.toLowerCase();
        const entry = this.services.get(name);
        assert(entry, `Service "${name}" doesn't exists.`);

        if (entry.factory) {
            entry.service = entry.factory(this);
            delete entry.factory;
        }

        return entry.service as T;
    }

    clear() {
        this.services.clear();
    }
}