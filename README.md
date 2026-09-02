# Extension Preflight

Check your Chrome extension package before Google does.

Drop in the ZIP you are about to upload. Extension Preflight reads it and reports the permission, manifest and packaging problems that Chrome Web Store reviewers look for, so you can fix them before a rejection costs you a week.

Live version: https://extensionpreflight.com

## Your code never leaves your browser

There is no server, no upload and no account. The ZIP is read in the tab, scanned in a Web Worker, and gone when you close the page.

You do not have to take that on trust. Check it yourself:

1. Search the source for network calls. `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` and `EventSource` appear nowhere in `src/`.
2. Read the Content Security Policy at the top of `index.html`. It sets `connect-src 'self'`, so the page cannot reach another server even if something tried.
3. Open your browser devtools, run a scan, and watch the network tab stay empty.

Being able to check that is the reason this code is public.

## What it checks

- Manifest present and valid
- Broad host permissions
- Permissions you never use
- Permissions already covered by another permission
- Content Security Policy problems
- Files referenced by the manifest but missing from the ZIP
- Scripts loaded from another server
- Obfuscated code

Each check is one file in `src/scan/rules`. If you disagree with a result, the rule that produced it is a short read.

## Run it

You need Node 20 or newer.

```
git clone https://github.com/ahmedfiazjan/extension-preflight.git
cd extension-preflight
npm install
npm run dev
```

Open the address the terminal prints. That is the whole setup.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app on your machine |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type check without building |
| `npm run build` | Type check, then build to `dist/` |

`dist/` is plain static files. Any static host will serve them. There is no backend to deploy and nothing to configure.

## What it does not do

It reads your package and nothing else. It cannot see your store listing, your privacy policy, or whether your extension actually works. A clean report is not a promise that Google will approve you.

## Contributing

Not accepting pull requests right now. Bug reports and false positives are genuinely useful, so please open an issue.

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE).

Copyright (C) 2026 ahmedfiazjan
