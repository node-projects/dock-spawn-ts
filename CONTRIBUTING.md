# Contributing

Use Node.js 24 and install the locked dependencies with `npm ci`.

```sh
npm test       # Compiles TypeScript and runs the regression suite
npm run build # Clean build: TypeScript, declarations, source maps, browser bundles
npm start     # Serve the demos locally after building
npm pack      # Builds and creates the installable npm .tgz
```

Submit source changes, relevant tests and documentation. Do not commit generated
JavaScript, declarations, source maps, bundles, copied bundle CSS, or package
tarballs. `lib/js/` and `lib/es5/` are ignored; authored styles in `lib/css/` and
images in `lib/images/` remain tracked. CI builds and tests every pull request
and push to master, and checks the package contents.

`build-es5.bat` is an optional Windows-only legacy build. Run it after
`npm run tsc` if you need the old global `DockSpawnTS` bundle. It is not part of
the standard npm release pipeline.

# Publishing a release

1. Merge the desired changes into master.
2. Create and publish a GitHub release targeting that commit, with a version tag
   such as `v3.26.0` or `3.26.0`. Use `v3.26.0-beta.1` for a prerelease.
3. The `Release` workflow checks out that tag, sets the package and lockfile
   versions from it without committing or creating another tag, runs the tests,
   builds, and creates `dock-spawn-ts-VERSION.tgz`.
4. That exact tarball is attached to the GitHub release and published to npm.
   Stable releases use npm's `latest` tag. A GitHub prerelease or a version with
   a prerelease suffix uses `next`.

Draft releases do not publish. Tags must be complete `MAJOR.MINOR.PATCH` versions
with an optional SemVer prerelease suffix and optional leading `v`. A version
already published to npm cannot be overwritten; publish a new version for changes.
If a run fails, inspect its logs and use GitHub's **Re-run failed jobs**.

The package is built by `prepack`, so local `npm pack` and `npm publish` also
include generated output. CI builds explicitly and uses `--ignore-scripts` when
packing/publishing so that the tested artifact is reused.

## npm authentication

The workflow uses npm trusted publishing (OIDC), with no `NPM_TOKEN` secret.
In the npm package settings for `dock-spawn-ts`, configure a GitHub Actions trusted
publisher with these exact values:

- Organization: `node-projects`
- Repository: `dock-spawn-ts`
- Workflow filename: `release.yml`
- Environment: leave empty
- Allowed action: direct publishing with `npm publish`

See [npm's trusted publishing instructions](https://docs.npmjs.com/trusted-publishers/).
Configure this before the first release; the workflow cannot grant itself access
to your npm package. Any newly configured publisher must be used within npm's
validation window.

## Demo hosting

The `Pages` workflow builds JavaScript from source, stages the demos and authored
assets, and deploys them to GitHub Pages. Repository **Settings → Pages → Source**
must be **GitHub Actions**. Demo builds are deployed from master without committing
their generated output.
