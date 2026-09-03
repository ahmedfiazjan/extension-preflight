# Extension Preflight

A deterministic scanner that reads a packaged Chrome extension and reports the
submission risks a Web Store reviewer is likely to raise. It runs entirely in
the browser, or from your terminal. It never uploads anything.

A clean scan is not a promise of approval. This reads your package, so it cannot
see your store listing, your privacy policy, or whether your extension works.

## What this repository is

The scanner engine, its tests, and a reference interface that runs it.

The hosted site at [extensionpreflight.com](https://extensionpreflight.com) uses
this engine. Its interface is a separate, unpublished codebase and is deployed
independently, so the site and this repository will not match file for file. The
site names the exact commit of this repository that its build used.

## Run it on your own package

```bash
npm install
npx vite-node scripts/scan-zip.ts path/to/your-extension.zip
```

That prints every finding, its severity, the basis on which the rule decided,
and the evidence excerpt from your own files. Nothing leaves your machine.

To run the reference interface instead:

```bash
npm run dev
```

## What it checks

Nine rules, all deterministic, all reading the package only:

| Rule | Basis |
|---|---|
| `manifest-missing` | ZIP entry listing |
| `manifest-invalid` | manifest.json parse |
| `broad-host-permissions` | Exact manifest match |
| `redundant-permission` | Exact manifest match |
| `csp-invalid` | Policy directive parse |
| `missing-referenced-file` | Manifest reference against ZIP listing |
| `remote-script` | HTML script tag parse |
| `unused-permission` | Whole-package text search |
| `obfuscated-code` | File statistics heuristic |

The last two are weaker evidence than the rest and say so in their output. A
text search and a statistical heuristic can be wrong in ways a manifest match
cannot.

## Tests

```bash
npm test
```

## Contributing

Not accepting pull requests yet. There is no contributor licence agreement in
place, and merging a contribution without one would permanently constrain how
this code can be used. Issues describing a false positive or a missed rule are
welcome and useful.

## Licence

AGPL-3.0-only. See `LICENSE`.
