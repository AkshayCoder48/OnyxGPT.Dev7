import puter from '@heyputer/puter.js';

/**
 * New Puter.js API adaptation for browser environment.
 * @param {string} token - Optional auth token.
 * @returns {import('@heyputer/puter.js').puter}
 */
export const init = (token) => {
    if (token) {
        puter.setAuthToken(token);
    }
    return puter;
};

/**
 * Ensures the user is authenticated and returns the token.
 * In the browser, this triggers the sign-in flow if needed.
 */
export const getAuthToken = async () => {
    if (!(await puter.auth.isSignedIn())) {
        await puter.auth.signIn();
    }
    return puter.getAuthToken();
};

export { puter };
export default puter;
