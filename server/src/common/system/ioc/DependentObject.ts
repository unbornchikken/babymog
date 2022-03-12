import type { Container } from './Container';

export class DependentObject {
    constructor(container: Container) {
        this.container = container;
    }

    protected readonly container: Container;
}