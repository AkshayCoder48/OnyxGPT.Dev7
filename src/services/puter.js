import puter from '@heyputer/puter.js';

// No special initialization needed for the standard browser flow
// but we can provide helper methods if needed.

export const getAuthToken = async () => {
    if (!(await puter.auth.isSignedIn())) {
        await puter.auth.signIn();
    }
    return puter.getAuthToken();
};

export { puter };
export default puter;
