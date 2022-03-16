import assert from 'assert';
import * as BABYLON from 'babylonjs';

export type BlockCoord = {
    x: number;
    y: number;
    z: number;
};

export const blockCoordFunctions = {
    create,
    zero,
    getVec,
    getXZ,
    getLeft,
    getRight,
    getFront,
    getBack,
    equals,
    toString,
};

function create(vec: BABYLON.Vector3): BlockCoord;
function create(x: number, z: number): BlockCoord;
function create(x: number, y: number, z?: number): BlockCoord;
function create(arg1: number | BABYLON.Vector3, arg2?: number, arg3?: number): BlockCoord {
    const coords = {
        x: 0,
        y: 0,
        z: 0,
    };

    if (typeof arg1 === 'object') {
        coords.x = Math.floor(arg1.x);
        coords.y = Math.floor(arg1.y);
        coords.z = Math.floor(arg1.z);
    }
    else if (arg3 !== undefined) {
        assert(arg2 !== undefined);
        coords.x = Math.floor(arg1);
        coords.y = Math.floor(arg2);
        coords.z = Math.floor(arg3);
    }
    else {
        assert(arg2 !== undefined);
        coords.x = Math.floor(arg1);
        coords.z = Math.floor(arg2);
    }

    return coords;
}

function zero(): BlockCoord {
    return {
        x: 0,
        y: 0,
        z: 0,
    };
}

function getVec(coord: BlockCoord) {
    return new BABYLON.Vector3(coord.x, coord.y, coord.z);
}

function getXZ(coord: BlockCoord): BlockCoord {
    return {
        x: coord.x,
        y: 0,
        z: coord.z,
    };
}

function getLeft(coord: BlockCoord): BlockCoord {
    return {
        x: coord.x - 1,
        y: 0,
        z: coord.z,
    };
}

function getRight(coord: BlockCoord): BlockCoord {
    return {
        x: coord.x + 1,
        y: 0,
        z: coord.z,
    };
}

function getFront(coord: BlockCoord): BlockCoord {
    return {
        x: coord.x,
        y: 0,
        z: coord.z + 1,
    };
}

function getBack(coord: BlockCoord): BlockCoord {
    return {
        x: coord.x,
        y: 0,
        z: coord.z - 1,
    };
}

function equals(coord1: BlockCoord, coord2: BlockCoord) {
    return coord1.x === coord2.x && coord1.y === coord2.y && coord1.z === coord2.z;
}

function toString(coord: BlockCoord) {
    return `${coord.x},${coord.y},${coord.z}`;
}