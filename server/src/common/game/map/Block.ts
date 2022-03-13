import type { BlockMaterialReference } from '../materials/BlockMaterialReference';

export type Block = {
    materialReference: BlockMaterialReference;
};

export const blockFunctions = {
    create
};

function create(materialReference: BlockMaterialReference): Block {
    return {
        materialReference
    };
}