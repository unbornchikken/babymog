import type { Container } from 'common/system/ioc/Container';
import { LoggerObject } from 'common/system/log/LoggerObject';
import assert from 'assert';
import { InternalError } from 'common/system/errors/InternalError';
import type { AtlasResult } from 'common/game/materials/AtlasResult';
import urljoin from 'url-join';
import * as BABYLON from 'babylonjs';

export type TextureAtlasOptions = {
    container: Container,
    collection?: string,
    id: string,
    size?: number,
};

export type TextureAtlasUrls = {
    imageUrl: string,
    metadataUrl: string,
};

export type TextureAtlasUVs = {
    [textureId: string]: BABYLON.Vector4
};

export class TextureAtlas extends LoggerObject {
    constructor(options: TextureAtlasOptions) {
        super(options.container);

        this.collection = options.collection;
        this.id = options.id;
        this.size = options.size;
    }

    public readonly collection?: string;

    public readonly id: string;

    get path() {
        return this.collection ? this.collection + '/' + this.id : this.id;
    }

    public readonly size?: number;

    private apiResult?: AtlasResult;

    private uvs?: TextureAtlasUVs;

    public async getImageUrl() {
        return urljoin('generated/textures/atlas', (await this.getApiResult()).imagePath);
    }

    public async getTextureUVs(textureId: string) {
        const uvs = await this.tryGetTextureUVs(textureId);
        if (uvs === undefined) {
            throw new InternalError(`Texture "${ textureId }" not found in atlas "${ this.path }".`);
        }
        return uvs;
    }

    public async tryGetTextureUVs(textureId: string): Promise<BABYLON.Vector4 | undefined> {
        const uvs = await this.getUVs();
        return uvs[textureId];
    }

    public async getTextureIds() {
        const uvs = await this.getUVs();
        return Object.keys(uvs);
    }

    public async getUVs() {
        if (this.uvs) {
            return this.uvs;
        }

        const apiResult = await this.getApiResult();

        let maxX = 0;
        let maxY = 0;
        for (const coords of Object.values(apiResult.textures)) {
            const currentMaxX = coords.x + coords.width - 1;
            const currentMaxY = coords.y + coords.height - 1;
            if (currentMaxY > maxY) {
                maxY = currentMaxY;
            }
            if (currentMaxX > maxX) {
                maxX = currentMaxX;
            }
        }

        this.uvs = {};
        for (const [id, coords] of Object.entries(apiResult.textures)) {
            const x1 = coords.x;
            const x2 = coords.x + coords.width - 1;
            const y1 = coords.y + coords.height - 1;
            const y2 = coords.y;
            const WD = 1 / coords.width;
            const HD = 1 / coords.height;
            const x1s = scale(x1, maxX) + WD;
            const x2s = scale(x2, maxX) - WD;
            const y1s = (1 - scale(y1, maxY)) + HD;
            const y2s = (1 - scale(y2, maxY)) - HD;
            this.uvs[id] = new BABYLON.Vector4(
                x1s,
                y1s,
                x2s,
                y2s,
            );
        }
        return this.uvs;

        function scale(value: number, max: number) {
            return value / max;
        }
    }

    private async getApiResult() {
        if (this.apiResult) {
            return this.apiResult;
        }

        const url ='api/atlas/' + this.path;
        const response = await fetch(url);
        this.apiResult = await response.json();
        assert(this.apiResult);
        return this.apiResult;
    }
}