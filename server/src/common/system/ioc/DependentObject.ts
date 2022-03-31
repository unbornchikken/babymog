import EventEmitter from 'events';
import type { Container } from './Container';

export class DependentObject extends EventEmitter {
    constructor(container: Container) {
        super();

        this.container = container;
    }

    protected readonly container: Container;
}