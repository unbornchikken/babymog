import assert from 'assert';

export class BlockMaterial {
    constructor(packId: string, textureId: string) {
        this.packId = packId;
        this.textureId = textureId;
    }

    readonly packId: string;

    readonly textureId: string;

    static fromJSON(json: any) {
        assert(typeof json === 'object');
        assert(typeof json._type === this.name);
        assert(typeof json.packId === 'string');
        assert(typeof json.textureId === 'string');
        return new BlockMaterial(json.packId, json.textureId);
    }

    toJson() {
        return {
            _type: this.constructor.name,
            packId: this.packId,
            textureId: this.textureId,
        };
    }
}