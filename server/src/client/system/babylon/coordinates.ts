import * as BABYLON from 'babylonjs';

type HasPosition = {
    position: BABYLON.Vector3
};

export type NodeWithPosition = BABYLON.Node & HasPosition;

export const coordinates = {
    getWorldPostion
};

function getWorldPostion(node: NodeWithPosition) {
    const m = node.getWorldMatrix();
    return BABYLON.Vector3.TransformCoordinates(node.position, m);
}