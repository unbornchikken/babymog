import type { Request, Response, NextFunction } from 'express';
import fs from 'fs-extra';
import { AtlasController, AtlasResultType } from '../controllers/AtlasController';
import path from 'path';
import { ApiRoute } from './ApiRoute';
import { RequestError } from '../system/errors/RequestError';
import type { Container } from 'common/system/ioc/Container';

const TTL = 2592000; // 30 days

const SAMPLE_BOX_FILES = [
    path.resolve(path.join(__dirname, '../../resources/textures/block/Front.png')),
    path.resolve(path.join(__dirname, '../../resources/textures/block/Back.png')),
    path.resolve(path.join(__dirname, '../../resources/textures/block/Top.png')),
    path.resolve(path.join(__dirname, '../../resources/textures/block/Bottom.png')),
    path.resolve(path.join(__dirname, '../../resources/textures/block/Left.png')),
    path.resolve(path.join(__dirname, '../../resources/textures/block/Right.png')),
];

const OUT_DIR = 'generated/atlas';

export class AtlasApi extends ApiRoute {
    constructor(container: Container) {
        super(container, 'atlas');

        this.controller = new AtlasController(container, OUT_DIR);
    }

    private controller: AtlasController;

    registerRoutes() {
        this.app.get(this.makeRoute('/sample-box'), (req, res, next) => this.sampleBoxImage(req, res, next));
        this.app.get(this.makeRoute('/sample-box/metadata'), (req, res, next) => this.sampleBoxMetadata(req, res, next));
    }

    async sampleBoxImage(req: Request, res: Response, next: NextFunction) {
        await this.atlasApi(req, res, next, SAMPLE_BOX_FILES, 'image');
    }

    async sampleBoxMetadata(req: Request, res: Response, next: NextFunction) {
        await this.atlasApi(req, res, next, SAMPLE_BOX_FILES, 'metadata');
    }

    private async atlasApi(req: Request, res: Response, next: NextFunction, patterns: string[], resultType: AtlasResultType) {
        try {
            const size = typeof req.query.size === 'string' ? parseInt(req.query.size) : undefined;
            if (size !== undefined && !(size > 0)) {
                throw new RequestError('"size" is invalid.');
            }
            const { resultFilePath, contentType } = await this.controller.createResultFile(patterns, size, resultType);
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