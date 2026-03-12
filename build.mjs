import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';
import fs from 'fs';

// Register Tokens Studio transforms
register(StyleDictionary);

// Read the multi-set token file exported from Figma
const tokensRaw = JSON.parse(fs.readFileSync('tokens/tokens.json', 'utf-8'));

// Extract the token set order and metadata
const metadata = tokensRaw['$metadata'];
const themes = tokensRaw['$themes'];
const tokenSetOrder = metadata?.tokenSetOrder || [];

// Flatten: merge all token sets into a single object, removing the
// "Primitivos/Mode 1", "Semantic-tokens/Mode 1", "Components/Mode 1" wrappers.
// This makes references like {Color-Base.Blue} resolvable since Color-Base
// will be at the top level.
const flattenedTokens = {};
for (const setName of tokenSetOrder) {
  const setTokens = tokensRaw[setName];
  if (setTokens) {
    Object.assign(flattenedTokens, setTokens);
  }
}

// Write flattened tokens to a temporary file for Style Dictionary to consume
fs.mkdirSync('tokens/.build', { recursive: true });
fs.writeFileSync('tokens/.build/tokens-flat.json', JSON.stringify(flattenedTokens, null, 2));

const sd = new StyleDictionary({
  source: ['tokens/.build/tokens-flat.json'],
  preprocessors: ['tokens-studio'],
  platforms: {
    css: {
      transformGroup: 'tokens-studio',
      prefix: 'sd',
      buildPath: 'build/css/',
      files: [
        {
          destination: '_variables.css',
          format: 'css/variables',
        },
      ],
    },
    android: {
      transformGroup: 'tokens-studio',
      transforms: ['name/kebab', 'color/hex', 'size/rem'],
      buildPath: 'build/android/src/main/res/values/',
      files: [
        {
          destination: 'style_dictionary_colors.xml',
          format: 'android/colors',
          filter: (token) => token.$type === 'color',
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();

// Clean up temp files
fs.rmSync('tokens/.build', { recursive: true, force: true });

console.log('Build completed successfully!');
