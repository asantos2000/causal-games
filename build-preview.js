/**
 * build-preview.js
 * Minifies + obfuscates the inline JS inside preview/kluster-v4.html
 * and writes the protected output to preview/kluster-v4.min.html
 *
 * Usage:  node build-preview.js
 */

const fs   = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC  = path.join(__dirname, 'preview', 'kluster-v4.html');
const DEST = path.join(__dirname, 'preview', 'kluster-v4.min.html');

const COPYRIGHT = `/* © ${new Date().getFullYear()} Causal Games — causal-games.com
   All rights reserved. Unauthorized copying, modification or redistribution
   of this software, in whole or in part, is strictly prohibited.
   Commit history at https://github.com/asantos2000/causal-games */\n`;

const html = fs.readFileSync(SRC, 'utf8');

// Extract the content of the first <script> block that is not a src= import
const scriptRe = /<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi;
const scripts  = [];
let m;
while ((m = scriptRe.exec(html)) !== null) {
  scripts.push({ full: m[0], code: m[1], index: m.index });
}

if (scripts.length === 0) {
  console.error('No inline <script> blocks found.');
  process.exit(1);
}

let processedHtml = html;

for (const s of scripts) {
  const result = JavaScriptObfuscator.obfuscate(s.code, {
    compact:                            true,
    controlFlowFlattening:              false,   // keep off — reduces perf too much for game loops
    deadCodeInjection:                  false,
    debugProtection:                    false,
    disableConsoleOutput:               false,   // keep console for game debug log
    identifierNamesGenerator:          'hexadecimal',
    renameGlobals:                      false,   // dangerous for Phaser globals
    rotateStringArray:                  true,
    selfDefending:                      false,   // breaks in some sandboxed envs
    shuffleStringArray:                 true,
    splitStrings:                       true,
    splitStringsChunkLength:            8,
    stringArray:                        true,
    stringArrayRotate:                  true,
    stringArrayShuffle:                 true,
    stringArrayWrappersCount:           2,
    stringArrayWrappersType:           'function',
    stringArrayEncoding:               ['base64'],
    stringArrayThreshold:               0.75,
    unicodeEscapeSequence:              false,
  });

  const obfuscated = `<script>\n${COPYRIGHT}${result.getObfuscatedCode()}\n</script>`;
  processedHtml = processedHtml.replace(s.full, obfuscated);
}

// Also inject a copyright meta tag in <head>
processedHtml = processedHtml.replace(
  /(<head[^>]*>)/i,
  `$1\n  <!-- © ${new Date().getFullYear()} Causal Games. All rights reserved. causal-games.com -->`
);

fs.writeFileSync(DEST, processedHtml, 'utf8');

const srcSize  = Buffer.byteLength(html,            'utf8');
const destSize = Buffer.byteLength(processedHtml,   'utf8');
console.log(`✓ Protected build written to: ${DEST}`);
console.log(`  Source:    ${(srcSize  / 1024).toFixed(1)} KB`);
console.log(`  Protected: ${(destSize / 1024).toFixed(1)} KB`);
