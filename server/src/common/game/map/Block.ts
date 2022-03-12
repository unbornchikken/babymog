import type { BlockMaterialReference } from '../materials/BlockMaterialReference';

export type Block = {
    materialReference: BlockMaterialReference;
};

export const BlockFunctions = {
    create
};

function create(materialReference: BlockMaterialReference): Block {
    return {
        materialReference
    };
}