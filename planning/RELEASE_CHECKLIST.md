# Release checklist — v1.0.0

- [x] Unit tests pass (`npm test`)
- [x] Browser smoke test passes (`npm run test:browser`)
- [x] `docs/` contains synthetic samples only; no business records in the repository
- [x] No external scripts, fonts or CDNs; CSP set
- [x] README, LICENSE (MIT), SECURITY, CONTRIBUTING, CHANGELOG
- [x] Use fits the plan’s 2026-11-15 reading of GitHub Pages limits (noncommercial open-source demo, no transactions, small static site)
- [ ] Re-read https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits before any change in how the tool is offered
- [x] Live demo deployed by copying `docs/` to `ashweak.github.io/sheetfix/` (redeploy the same way after each release)
- [ ] Live smoke test at https://ashweak.github.io/sheetfix/ (all three workflows, worker, downloads, refresh)
- [ ] Tag `v1.0.0` recorded with release commit
- [ ] Real-device check: Android Chrome, iOS Safari (record versions before listing as supported)
- [ ] Manual screen-reader pass (NVDA or VoiceOver) on core workflows
- [ ] Owner pilot (plan §16) with 3–5 users

## Rollback

`git revert <release commit>` and push to `main`; Pages redeploys. No persisted data to migrate. Users with the page open keep old code until refresh — the app version is shown in the sidebar.
