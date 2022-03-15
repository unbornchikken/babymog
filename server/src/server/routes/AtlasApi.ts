import type { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import { AtlasController } from '../controllers/AtlasController';
import { ApiRoute } from './ApiRoute';
import { RequestError } from '../system/errors/RequestError';
import type { Container } from 'common/system/ioc/Container';

const TTL = 60; // 1 min

export type RequestFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export class AtlasApi extends ApiRoute {
    constructor(container: Container) {
        super(container, 'atlas');

        this.controller = new AtlasController(container);
    }

    private controller: AtlasController;

    registerRoutes() {
        this.app.get(this.makeRoute('/sample-box'), this.atlasApi('sample-box'));
        this.app.get(this.makeRoute('/:collection/:id'), this.atlasApi());
    }

    private atlasApi(id?: string): RequestFunction {
        return async (req, res, next) => {
            try {
                let collection: string | undefined;
                let atlasId: string;
                if (id !== undefined) {
                    atlasId = id;
                }
                else {
                    collection = req.params.collection;
                    atlasId = req.params.id;
                }
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
        };
    }
}