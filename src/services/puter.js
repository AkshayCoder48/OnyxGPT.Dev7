import puter from '@heyputer/puter.js';

export const getAuthToken = async () => {
    if (!(await puter.auth.isSignedIn())) {
        await puter.auth.signIn();
    }
    return puter.getAuthToken();
};

// KV Helpers
export const kv = {
    set: (key, value) => puter.kv.set(key, value),
    get: (key) => puter.kv.get(key),
    del: (key) => puter.kv.del(key),
    list: () => puter.kv.list(),
};

// Worker Helpers
export const workers = {
    create: (name, code) => puter.worker.create(name, code),
    update: (name, code) => puter.worker.update(name, code),
    delete: (name) => puter.worker.delete(name),
    list: () => puter.worker.list(),
    get: (name) => puter.worker.get(name),
    run: (name, args) => puter.worker.run(name, args),
};

// FS Helpers
export const fs = {
    write: (path, content) => puter.fs.write(path, content),
    read: (path) => puter.fs.read(path),
    delete: (path) => puter.fs.delete(path),
    list: (path) => puter.fs.list(path),
};

export { puter };
export default puter;
