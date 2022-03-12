import assert from 'assert';

export type BlockMaterialReference = {
    packId: string;
    materialId: string;
};

export const BlockMaterialReferenceFunctions = {
    create
};

function create(packId: string, materialId: string): BlockMaterialReference {
    assert(packId);
    assert(materialId);

    return {
        packId,
        materialId: materialId,
    };
}