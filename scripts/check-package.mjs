import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const [packed] = JSON.parse(readFileSync('pack.json', 'utf8'));
const files = new Set(packed.files.map(file => file.path));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(packed.version, pkg.version);
for (const path of [pkg.main.replace(/^\.\//, ''), 'lib/js/index.js', 'lib/js/index.d.ts',
    'lib/js/index-min.js', 'lib/js/index-webcomponent-min.js',
    'lib/css/dock-manager.css', 'lib/css/dock-manager-style.css', 'lib/images/close.svg'])
    assert.ok(files.has(path), `Package is missing ${path}`);
const bundle = readFileSync('lib/js/index-webcomponent-min.js', 'utf8');
for (const match of bundle.matchAll(/\.\/([^"']+\.css)/g))
    assert.ok(files.has(`lib/js/${match[1]}`), `Package is missing bundled CSS: ${match[1]}`);
assert.ok(![...files].some(path => path.startsWith('node_modules/') || path.startsWith('.github/')));
console.log(`Verified ${packed.filename}: ${files.size} files, version ${packed.version}`);
