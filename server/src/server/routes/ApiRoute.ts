import { LoggerObject } from 'common/system/log/LoggerObject';
import urljoin from 'url-join';
import type { Express } from 'express';
import type { Container } from 'common/system/ioc/Container';

export class ApiRoute extends LoggerObject {
    constructor(container: Container, rootUrl?: string) {
        super(container);

        this.rootUrl = rootUrl;
    }

    protected rootUrl?: string;

    protected get app() {
        return this.container.get<Express>('app');
    }

    protected makeRoute(url: string) {
        return this.rootUrl ? urljoin('/api', this.rootUrl, url) : urljoin('/api', url);
    }
}