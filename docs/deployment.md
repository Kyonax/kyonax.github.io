# Deployment

How `dist/` reaches production at <https://kyonax.com>. Nothing here is manual:
the whole chain is Git-driven, and the only human action that ships the site is
a push (or merge) to `main`.

## The chain

```
push / merge to main
  └─> GitHub Actions: .github/workflows/deploy-to-build-main.yml
        checkout -> node 20 -> npm ci -> npm run precheck -> npm run build
        └─> s0/git-publish-subdir-action pushes dist/ to the build-main branch
              (SQUASH_HISTORY: true — build-main always holds exactly one commit,
               "Build in Main Environment: (<sha>) <msg>")
              └─> Hostinger hPanel Git integration pulls build-main into
                    /home/u367645623/domains/kyonax.com/public_html
```

- **Trigger**: push to `main`, plus manual `workflow_dispatch` from the Actions
  tab for a re-deploy without a new commit.
- **Gates in the deploy path**: `precheck` and `build` (which itself runs the
  SSG pass, `defer-async-css` and `seo-audit`). Lint, tests and `check:size`
  run in `ci.yml`, not here — a red CI does not block the deploy workflow.
- **Hosting**: Hostinger CloudLinux plan, account `u367645623`, vhost
  `kyonax.com` (main), docroot
  `/home/u367645623/domains/kyonax.com/public_html`. Apache-style serving;
  `public/.htaccess` ships inside `dist/` and is the server config.
- **Staging**: `deploy-to-build-dev.yml` is the same pipeline from `develop`
  to the `build-dev` branch, intended for a Hostinger subdomain or
  preview-link sharing.

## Verifying a deploy

```sh
git fetch origin build-main
git log origin/build-main -1 --format='%h %ad %s' --date=short
```

The commit message embeds the source sha it was built from — compare it with
`git rev-parse --short main`. If build-main is current but the live site is
not, the hPanel pull is the broken link (see below).

## The one link owned by hPanel, not the repo

The pull from `build-main` into `public_html` is configured in hPanel
(Websites -> kyonax.com -> Advanced -> Git). Whether it fires automatically on
push (webhook) or needs a manual "Deploy" click lives in that panel and is not
visible from the repository. If the site ever lags behind a green deploy
workflow, check that integration first.
