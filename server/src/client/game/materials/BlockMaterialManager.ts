import { BlockMaterialPack, blockMaterialPackFunctions } from 'common/game/materials/BlockMaterialPack';
import { knownAtlasCollections } from 'common/game/materials/knownAtlasCollections';
import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { TextureAtlas } from '../../system/resources/TextureAtlas';

type Entry = {
    id: string,
    atlas: TextureAtlas,
    latAccess: number,
};

export type BlockMaterialManagerOptions = {
    container: Container,
    textureSize?: number,
};

export class BlockMaterialManager extends LoggerObject {
    constructor(options: BlockMaterialManagerOptions) {
        super(options.container);

        this.textureSize = options.textureSize;
    }

    readonly textureSize?: number;

    private readonly atlases = new Map<string, Entry>();

    getAtlasPacks(packIds: string[]) {
        packIds.sort();
        const combinedAtlasId = packIds.join('|');

        let entry = this.atlases.get(combinedAtlasId);
        if (!entry) {
            entry = {
                id: combinedAtlasId,
                latAccess: Date.now(),
                atlas: new TextureAtlas({
                    container: this.container,
                    id: combinedAtlasId,
                    collection: knownAtlasCollections.blockMaterialPacks,
                })
            };
        }
    }
}