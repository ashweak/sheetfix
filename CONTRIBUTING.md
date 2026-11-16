# Contributing

1. Use synthetic data only — in fixtures, samples, screenshots and bug reports.
2. Keep `docs/` build-free: vanilla ES modules, no external scripts, fonts or CDNs, no network calls with file data.
3. Domain logic lives in `docs/assets/js/core/` with no DOM access, and needs unit tests in `tests/unit/`.
4. Render user data as text nodes only; never use `innerHTML` or `eval` with file content.
5. Run before opening a pull request:

```bash
npm test
npm run test:browser
```

6. Review `git status` and staged files before pushing. Ignore rules cannot undo a file that was already committed.
