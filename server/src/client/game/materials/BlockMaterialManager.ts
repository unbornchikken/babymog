import { BlockMaterial, BlockMaterialPack, blockMaterialPackFunctions } from 'common/game/materials/BlockMaterialPack';
import { knownAtlasCollections } from 'common/game/materials/knownAtlasCollections';
import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { TextureAtlas } from '../../system/resources/TextureAtlas';
import type * as BABYLON from 'babylonjs';

type AtlasEntry = {
    id: string,
    atlas: TextureAtlas,
    latAccess: number,
};

type PackEntry = {
    id: string,
    pack: BlockMaterialPack,
    latAccess: number,
};

export type BlockMaterialUVs = {
    top: BABYLON.Vector4,
    bottom: BABYLON.Vector4,
    left: BABYLON.Vector4,
    right: BABYLON.Vector4,
    front: BABYLON.Vector4,
    back: BABYLON.Vector4,
};

export type GetBlockMaterialUVs = (materialId: string) => Promise<BlockMaterialUVs>;

export type BlockMaterialPackInfo = {
    atlasImageUrl: string,
    pack: BlockMaterialPack,
    uvs: GetBlockMaterialUVs
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

    private readonly atlases = new Map<string, AtlasEntry>();

    private readonly packs = new Map<string, PackEntry>();

    async getPackInfo(packId: string): Promise<BlockMaterialPackInfo> {
        const atlas = this.getPackAtlas(packId);
        const pack = await this.getPack(packId);

        return {
            pack,
            atlasImageUrl: await atlas.getImageUrl(),
            uvs: async materialId => {
                const material = blockMaterialPackFunctions.getMaterial(pack, materialId);
                return {
                    top: await atlas.getTextureUVs(blockMaterialPackFunctions.getTopTexture(material)),
                    bottom: await atlas.getTextureUVs(blockMaterialPackFunctions.getBottomTexture(material)),
                    left: await atlas.getTextureUVs(blockMaterialPackFunctions.getLeftTexture(material)),
                    right: await atlas.getTextureUVs(blockMaterialPackFunctions.getRightTexture(material)),
                    front: await atlas.getTextureUVs(blockMaterialPackFunctions.getFrontTexture(material)),
                    back: await atlas.getTextureUVs(blockMaterialPackFunctions.getBackTexture(material)),
                };
            }
        };
    }

    private getPackAtlas(packId: string) {
        let entry = this.atlases.get(packId);
        if (!entry) {
            entry = {
                id: packId,
                latAccess: Date.now(),
                atlas: new TextureAtlas({
                    container: this.container,
                    id: packId,
                    collection: knownAtlasCollections.blockMaterialPacks,
                })
            };
            this.atlases.set(packId, entry);
        }
        else {
            entry.latAccess = Date.now();
        }
        return entry.atlas;
    }

    private async getPack(packId: string) {
        let entry = this.packs.get(packId);
        if (!entry) {
            entry = {
                id: packId,
                latAccess: Date.now(),
                pack: await this.getPackFromApi(packId)
            };
            this.packs.set(packId, entry);
        }
        else {
            entry.latAccess = Date.now();
        }
        return entry.pack;
    }

    private async getPackFromApi(packId: string) {
        const response = await fetch('api/materials/block-material-pack/' + packId);
        return await response.json();
    }
}