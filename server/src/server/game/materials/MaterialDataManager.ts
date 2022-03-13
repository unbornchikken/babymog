import assert from 'assert';
import { BlockMaterialPack, blockMaterialPackFunctions } from 'common/game/materials/BlockMaterialPack';
import { knownMaterialPacks } from 'common/game/materials/knownMaterialPacks';
import { knownMaterials } from 'common/game/materials/knownMaterials';
import { LoggerObject } from 'common/system/log/LoggerObject';

export class MaterialDataManager extends LoggerObject {
    async getBlockMaterialPacks(ids: string[]) {
        assert(ids.length === 1);
        assert(ids[0] === knownMaterialPacks.block.standard);

        return [
            blockMaterialPackFunctions.create(
                knownMaterialPacks.block.standard,
                [
                    {
                        id: knownMaterials.block.top,
                        type: 'prismatic',
                        topTexture: 'block/Grass',
                        sideTexture: 'block/Grass_Side',
                        bottomTexture: 'block/Ground',
                    },
                    {
                        id: knownMaterials.block.topFilled,
                        type: 'homogene',
                        texture: 'block/Grass',
                    },
                    {
                        id: knownMaterials.block.crust,
                        type: 'homogene',
                        texture: 'block/Ground',
                    }
                ]
            )
        ];
    }
}