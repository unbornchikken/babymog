import { exec, ExecOptions } from 'child_process';

export type ExecResult = {
    stdout: string | Buffer,
    stderr: string | Buffer,
};

export const execHelpers = {
    run
};

async function run(cmd: string, args?: string[], options?: ExecOptions) {
    return new Promise<ExecResult>((resolve, reject) => {
        try {
            if (args?.length) {
                cmd += ' ' + args.join(' ');
            }
            exec(cmd, options, (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({ stderr, stdout });
            });
        }
        catch (err) {
            reject(err);
        }
    });
}