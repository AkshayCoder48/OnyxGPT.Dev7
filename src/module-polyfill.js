export const createRequire = (url) => {
  return (id) => {
    console.warn(`require(${id}) called from ${url}, returning empty object`);
    return {};
  };
};

export default {
  createRequire,
};
