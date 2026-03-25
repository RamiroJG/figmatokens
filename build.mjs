import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';
import fs from 'fs';

// Register Tokens Studio transforms
register(StyleDictionary);

// Read the multi-set token file exported from Figma
const tokensRaw = JSON.parse(fs.readFileSync('token/token.json', 'utf-8'));

// Extract the token set order and metadata
const metadata = tokensRaw['$metadata'];
const tokenSetOrder = metadata?.tokenSetOrder || [];

// Flatten: merge all token sets into a single object in order.
// This removes the set-name wrappers so that cross-set references
// (like {Primitivos.Azul}) resolve correctly.
const flattenedTokens = {};
for (const setName of tokenSetOrder) {
  const setTokens = tokensRaw[setName];
  if (setTokens) {
    Object.assign(flattenedTokens, setTokens);
  }
}

// Write flattened tokens to a temporary file for Style Dictionary to consume
fs.mkdirSync('token/.build', { recursive: true });
fs.writeFileSync('token/.build/tokens-flat.json', JSON.stringify(flattenedTokens, null, 2));

const sd = new StyleDictionary({
  source: ['token/.build/tokens-flat.json'],
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
  },
});

await sd.buildAllPlatforms();

// Clean up temp files
fs.rmSync('token/.build', { recursive: true, force: true });

console.log('Build completed successfully!');
