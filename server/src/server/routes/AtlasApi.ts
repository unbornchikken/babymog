import type { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import { AtlasController } from '../controllers/AtlasController';
import { ApiRoute } from './ApiRoute';
import { RequestError } from '../system/errors/RequestError';
import type { Container } from 'common/system/ioc/Container';

const TTL = 60; // 1 min

export class AtlasApi extends ApiRoute {
    constructor(container: Container) {
        super(container, 'atlas');

        this.controller = new AtlasController(container);
    }

    private controller: AtlasController;

    registerRoutes() {
        this.app.get(this.makeRoute('/sample-box'), async (req, res, next) => await this.atlasApi(req, res, next, undefined, 'sample-box'));
        this.app.get(this.makeRoute('/:collection/:id'), async (req, res, next) => await this.atlasApi(req, res, next, req.params.collection, req.params.id));
    }

    private async atlasApi(req: Request, res: Response, next: NextFunction, collection: string | undefined, atlasId: string) {
        try {
            const size = typeof req.query.size === 'string' ? parseInt(req.query.size) : undefined;
            if (size !== undefined && !(size > 0)) {
                throw new RequestError('"size" is invalid.');
            }
            const result = await this.controller.createResult(collection, atlasId, size);
            res.header('Cache-Control', `public, max-age=${ TTL }`);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}