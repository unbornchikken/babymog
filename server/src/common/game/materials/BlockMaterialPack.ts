import { InternalError } from 'common/system/errors/InternalError';
import { knownMaterials } from './knownMaterials';

export type HomogeneBlockMaterial = {
    type: 'homogene',
    id: string,
    texture: string,
};

export type PrismaticBlockMaterial = {
    type: 'prismatic',
    id: string,
    topTexture: string,
    sideTexture: string,
    bottomTexture: string,
};

export type DetailedBlockMaterial = {
    type: 'detailed',
    id: string,
    topTexture: string,
    bottomTexture: string,
    leftTexture: string,
    rightTexture: string,
    frontTexture: string,
    backTexture: string,
};

export type BlockMaterial = HomogeneBlockMaterial | PrismaticBlockMaterial | DetailedBlockMaterial;

export type BlockMaterialPack = {
    id: string,
    defaultMaterialId: string,
    materials: BlockMaterial[],
};

export const BlockMaterialPackFunctions = {
    create,
    getTextures,
    getMaterial,
    tryGetMaterial,
};

function create(id: string, materials: BlockMaterial[], defaultMaterialId?: string): BlockMaterialPack {
    return {
        id,
        defaultMaterialId: defaultMaterialId ?? knownMaterials.crust,
        materials,
    };
}

function* getTextures(pack: BlockMaterialPack) {
    for (const mat of pack.materials) {
        if (mat.type === 'homogene') {
            yield mat.texture;
        }
        else if (mat.type === 'prismatic') {
            yield mat.bottomTexture;
            yield mat.sideTexture;
            yield mat.topTexture;
        }
        else {
            yield mat.backTexture;
            yield mat.bottomTexture;
            yield mat.frontTexture;
            yield mat.leftTexture;
            yield mat.rightTexture;
            yield mat.topTexture;
        }
    }
}

function getMaterial(pack: BlockMaterialPack, id: string): BlockMaterial {
    const mat = tryGetMaterial(pack, id);
    if (!mat) {
        throw new InternalError(`Material "${id}" not found.`);
    }
    return mat;
}

function tryGetMaterial(pack: BlockMaterialPack, id: string): BlockMaterial | undefined {
    let def: BlockMaterial | undefined;
    for (const mat of pack.materials) {
        if (mat.id === id) {
            return mat;
        }
        if (mat.id === pack.defaultMaterialId) {
            def = mat;
        }
    }
    return def;
}