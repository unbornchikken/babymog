import type { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import { AtlasController, AtlasResultType } from '../controllers/AtlasController';
import { ApiRoute } from './ApiRoute';
import { RequestError } from '../system/errors/RequestError';
import type { Container } from 'common/system/ioc/Container';

const TTL = 2592000; // 30 days

export class AtlasApi extends ApiRoute {
    constructor(container: Container) {
        super(container, 'atlas');

        this.controller = new AtlasController(container);
    }

    private controller: AtlasController;

    registerRoutes() {
        this.app.get(this.makeRoute('/sample-box'), (req, res, next) => this.sampleBoxImage(req, res, next));
        this.app.get(this.makeRoute('/sample-box/metadata'), (req, res, next) => this.sampleBoxMetadata(req, res, next));
        this.app.get(this.makeRoute('/:collection/:id'), (req, res, next) => this.atlasImage(req, res, next));
        this.app.get(this.makeRoute('/:collection/:id'), (req, res, next) => this.atlasMetadata(req, res, next));
    }

    async sampleBoxImage(req: Request, res: Response, next: NextFunction) {
        await this.atlasApi(req, res, next, undefined, 'sample-box', 'image');
    }

    async sampleBoxMetadata(req: Request, res: Response, next: NextFunction) {
        await this.atlasApi(req, res, next, undefined, 'sample-box', 'metadata');
    }

    async atlasImage(req: Request, res: Response, next: NextFunction) {
        await this.atlasApi(req, res, next, req.params.collection, req.params.id, 'image');
    }

    async atlasMetadata(req: Request, res: Response, next: NextFunction) {
        await this.atlasApi(req, res, next, req.params.collection, req.params.id, 'metadata');
    }

    private async atlasApi(req: Request, res: Response, next: NextFunction, collection: string | undefined, atlasId: string, resultType: AtlasResultType) {
        try {
            const size = typeof req.query.size === 'string' ? parseInt(req.query.size) : undefined;
            if (size !== undefined && !(size > 0)) {
                throw new RequestError('"size" is invalid.');
            }
            const { resultFilePath, contentType } = await this.controller.createResultFile(collection, atlasId, size, resultType);
            const stream = fs.createReadStream(resultFilePath);
            res.contentType(contentType);
            res.header('Cache-Control', `public, max-age=${ TTL }`);
            stream.on('error', next);
            stream.pipe(res);
        }
        catch (err) {
            next(err);
        }
    }
}