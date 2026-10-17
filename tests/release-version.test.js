import assert from 'node:assert/strict';
import { test } from 'node:test';
import { releaseVersion } from '../scripts/release-version.mjs';

test('release tags supply the exact package version and npm distribution tag', () => {
    assert.deepEqual(releaseVersion('v3.26.0'), { version: '3.26.0', distTag: 'latest' });
    assert.deepEqual(releaseVersion('3.26.0'), { version: '3.26.0', distTag: 'latest' });
    assert.deepEqual(releaseVersion('v3.26.0-beta.1'), { version: '3.26.0-beta.1', distTag: 'next' });
    assert.deepEqual(releaseVersion('v3.26.0', true), { version: '3.26.0', distTag: 'next' });
    assert.deepEqual(releaseVersion('0.0.0-0'), { version: '0.0.0-0', distTag: 'next' });
});

test('malformed release tags fail before changing the package version', () => {
    for (const tag of [undefined, '', 'latest', '3', '3.26', 'v01.2.3', '1.2.3-01',
        '1.2.3-beta..1', '1.2.3+metadata', 'v1.2.3\n', 'v1.2.3\nextra', 'v1.2.3; echo unsafe', '../1.2.3'])
        assert.throws(() => releaseVersion(tag), /Invalid release tag/);
});
