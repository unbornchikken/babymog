import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { AtlasGenerator } from '../system/utils/AtlasGenerator';
import path from 'path';
import { MaterialDataManager } from '../game/materials/MaterialDataManager';
import { knownAtlasCollections } from 'common/game/materials/knownAtlasCollections';

const TEXTURES_PATH = path.resolve(path.join(__dirname, '../../resources/textures'));

const SAMPLE_BOX_FILES = [
    path.resolve(path.join(TEXTURES_PATH, 'block/Front.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Back.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Top.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Bottom.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Left.png')),
    path.resolve(path.join(TEXTURES_PATH, 'block/Right.png')),
];

const OUT_DIR = 'generated/atlas';

export type AtlasResultType = 'image' | 'metadata';

export class AtlasController extends LoggerObject {
    constructor(container: Container, outDir: string = OUT_DIR) {
        super(container);

        this.outDir = outDir;
    }

    private outDir: string;

    async createResultFile(collection: string | undefined, atlasId: string, size: number | undefined, resultType: AtlasResultType) {
        if (atlasId === 'sample-box') {
            return await this.createResultFileFromPatterns(SAMPLE_BOX_FILES, size, resultType);
        }

        const dataMan = this.container.get<MaterialDataManager>('MaterialDataManager');
        if (collection === knownAtlasCollections.blockMaterialPacks) {
            const packs = await dataMan.getBlockMaterialPacks(atlasId.split('|'));
        }
    }

    private async createResultFileFromPatterns(patterns: string[], size: number | undefined, resultType: AtlasResultType) {
        const gen = new AtlasGenerator({
            id: 'sample-box',
            logger: this.logger,
            outDir: this.outDir,
            patterns,
            size
        });
        const genResult = await gen.generate();
        let resultFilePath: string;
        let contentType: string;
        if (resultType === 'image') {
            resultFilePath = genResult.imagePath;
            contentType = 'image/png';
        }
        else {
            resultFilePath = genResult.metadataPath;
            contentType = 'application/json';
        }
        return { resultFilePath, contentType };
    }
}