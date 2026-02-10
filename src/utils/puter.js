/**
 * Utility to wait for Puter.js to be available on the window object.
 */
export function waitForPuter(timeout = 10000) {
    return new Promise((resolve, reject) => {
        if (window.puter) {
            resolve(window.puter);
            return;
        }

        const start = Date.now();
        const interval = setInterval(() => {
            if (window.puter) {
                clearInterval(interval);
                resolve(window.puter);
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error("Puter.js load timeout"));
            }
        }, 100);
    });
}
