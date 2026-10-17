import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function releaseVersion(tag, prerelease = false) {
    const version = tag?.replace(/^v/, '');
    const number = '(?:0|[1-9][0-9]*)';
    const identifier = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
    const pattern = new RegExp(`^${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?$`);
    if (!version || version.trim() !== version || !pattern.test(version))
        throw new Error(`Invalid release tag: ${tag}. Use vMAJOR.MINOR.PATCH[-prerelease].`);
    return { version, distTag: prerelease || version.includes('-') ? 'next' : 'latest' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { version, distTag } = releaseVersion(process.env.RELEASE_TAG, process.env.RELEASE_PRERELEASE === 'true');
    appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ndist_tag=${distTag}\n`);
}
