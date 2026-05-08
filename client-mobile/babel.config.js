const path = require('node:path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Alias @shared/* → repo-root shared/* so Metro resolves it without
      // tripping over its strict "files outside project root" check. Babel
      // rewrites the import path to an absolute path BEFORE Metro sees it.
      [
        'module-resolver',
        {
          alias: {
            '@shared': path.resolve(__dirname, '../shared'),
          },
        },
      ],
      // react-native-worklets/plugin MUST be last
      // (replaces react-native-reanimated/plugin in reanimated 4.x)
      'react-native-worklets/plugin',
    ],
  };
};
