import assert from 'assert';
import { BlockMaterialPack, blockMaterialPackFunctions } from 'common/game/materials/BlockMaterialPack';
import { knownMaterialPacks } from 'common/game/materials/knownMaterialPacks';
import { knownMaterials } from 'common/game/materials/knownMaterials';
import { LoggerObject } from 'common/system/log/LoggerObject';

export class MaterialDataManager extends LoggerObject {
    async getBlockMaterialPack(id: string) {
        assert(id === knownMaterialPacks.block.standard, 'Only "standard" material pack is supported.');

        return blockMaterialPackFunctions.create(
            knownMaterialPacks.block.standard,
            [
                {
                    id: knownMaterials.block.top,
                    type: 'prismatic',
                    topTexture: 'Grass',
                    sideTexture: 'Grass_Side',
                    bottomTexture: 'Ground',
                },
                {
                    id: knownMaterials.block.topFilled,
                    type: 'homogene',
                    texture: 'Grass',
                },
                {
                    id: knownMaterials.block.crust,
                    type: 'homogene',
                    texture: 'Ground',
                }
            ]
        );
    }
}