type AtlasTextureMetadata = {
    [texture: string]: {
        x: number,
        y: number,
        width: number,
        height: number,
    }
};

export type AtlasResult = {
    imagePath: string,
    textures: AtlasTextureMetadata,
};