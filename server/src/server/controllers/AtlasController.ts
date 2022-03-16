import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { AtlasGenerator } from '../system/utils/AtlasGenerator';
import path from 'path';
import type { MaterialDataManager } from '../game/materials/MaterialDataManager';
import { knownAtlasCollections } from 'common/game/materials/knownAtlasCollections';
import { BlockMaterialPack, blockMaterialPackFunctions } from 'common/game/materials/BlockMaterialPack';
import assert from 'assert';
import { RequestError } from '../system/errors/RequestError';
import fs from 'fs-extra';
import type { AtlasResult } from 'common/game/materials/AtlasResult';

const TEXTURES_PATH = path.resolve(path.join(__dirname, '../../resources/textures'));

const SAMPLE_BOX_FILES = [
    path.resolve(path.join(TEXTURES_PATH, 'block/Front.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Back.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Top.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Bottom.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Left.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Right.png')),
];

const OUT_DIR = 'generated/textures/atlas';

export class AtlasController extends LoggerObject {
    constructor(container: Container, outDir: string = OUT_DIR) {
        super(container);

        this.outDir = outDir;
    }

    private outDir: string;

    private getMaterialDataManager() {
        return this.container.get<MaterialDataManager>('MaterialDataManager');
    }

    async createResult(collection: string | undefined, atlasId: string, size: number | undefined) {
        if (atlasId === 'sample-box') {
            return await this.createResultFromPatterns(collection, atlasId, SAMPLE_BOX_FILES, size);
        }

        if (collection === knownAtlasCollections.blockMaterialPacks) {
            const pack = await this.getMaterialDataManager().getBlockMaterialPack(atlasId);
            const textures = this.collectTextures(pack);
            const files = [];
            for (const texture of textures) {
                files.push(path.join(TEXTURES_PATH, 'block', texture));
            }
            assert(files.length);
            return await this.createResultFromPatterns(collection, atlasId, files, size);
        }

        throw new RequestError(`Unknown texture atlas (collection: "${ collection ?? ''}", atlasId: "${ atlasId }").`);
    }

    private collectTextures(pack: BlockMaterialPack) {
        const textures = new Set<string>();
        for (const texture of blockMaterialPackFunctions.getTextures(pack)) {
            textures.add(texture + '.png');
        }
        return textures;
    }

    private async createResultFromPatterns(collection: string | undefined, atlasId: string, patterns: string[], size: number | undefined): Promise<AtlasResult> {
        if (collection) {
            atlasId = collection + '/' + atlasId;
        }
        const gen = new AtlasGenerator({
            id: atlasId,
            logger: this.logger,
            outDir: this.outDir,
            patterns,
            size
        });
        const genResult = await gen.generate();

        return {
            imagePath: AtlasController.fixImagePath(genResult.imagePath),
            textures: await fs.readJSON(genResult.metadataPath),
        };
    }

    private static fixImagePath(imagePath: string) {
        const parts = imagePath.replaceAll('\\', '/').split(OUT_DIR + '/');
        assert(parts.length === 2);
        return parts[1];
    }
}