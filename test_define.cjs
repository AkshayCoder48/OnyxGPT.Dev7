const { getParameters } = require('codesandbox/lib/api/define');

const parameters = getParameters({
  files: {
    'index.js': {
      content: 'console.log("hello world!");',
      isBinary: false,
    },
    'package.json': {
      content: {
        dependencies: {},
      },
    },
  },
});

console.log("Parameters:", parameters.substring(0, 50) + "...");
