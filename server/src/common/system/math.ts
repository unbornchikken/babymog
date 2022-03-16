export const math = {
    clamp
};

function clamp(num: number, a: number, b: number) {
    return Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));
}