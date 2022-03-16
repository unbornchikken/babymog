import { BlockMaterialPack, blockMaterialPackFunctions } from 'common/game/materials/BlockMaterialPack';
import { knownMaterialPacks } from 'common/game/materials/knownMaterialPacks';
import { knownMaterials } from 'common/game/materials/knownMaterials';
import { LoggerObject } from 'common/system/log/LoggerObject';
import { RequestError } from '../../system/errors/RequestError';

export class MaterialDataManager extends LoggerObject {
    async getBlockMaterialPack(id: string) {
        if (id === knownMaterialPacks.block.sample) {
            return blockMaterialPackFunctions.create(
                knownMaterialPacks.block.sample,
                [
                    {
                        id: knownMaterials.block.crust,
                        type: 'detailed',
                        topTexture: 'Top',
                        bottomTexture: 'Bottom',
                        leftTexture: 'Left',
                        rightTexture: 'Right',
                        frontTexture: 'Front',
                        backTexture: 'Back',
                    }
                ]
            );
        }

        if (id === knownMaterialPacks.block.sample) {
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

        throw new RequestError(`Unknown material pack "${id}".`);
    }
}