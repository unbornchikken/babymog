import { promises as fs } from 'fs';

export const fsHelpers = {
    tryTouch,
    fileExists,
    dirExists,
};

async function tryTouch(path: string) {
    try {
        const now = new Date();
        await fs.utimes(path, now, now);
        return true;
    }
    catch {
        return false;
    }
}

async function fileExists(path: string) {
    try {
        const stat = await fs.stat(path);
        return stat.isFile();
    }
    catch {
        return false;
    }
}

async function dirExists(path: string) {
    try {
        const stat = await fs.stat(path);
        return stat.isDirectory();
    }
    catch {
        return false;
    }
}