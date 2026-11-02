# industrio — publish runbook

End-to-end: get the site live at `https://charlesjoyce88.github.io/industrio`.
First-time setup is ~15 minutes. After that, publishing an update is three
commands.

---

## One-time setup

### 1. Create the repo on GitHub

In your browser:

1. Go to <https://github.com/new>
2. **Owner:** `CharlesJoyce88`
3. **Repository name:** `industrio`
4. **Visibility:** `Private`
5. **Do NOT** check "Add a README", "Add .gitignore", or "Choose a license"
   — we already have those locally, and letting GitHub add them creates a
   merge conflict on the first push.
6. Click **Create repository**.

GitHub will show you a "quick setup" page. Leave that tab open; you'll want
the URL (should be `https://github.com/CharlesJoyce88/industrio.git`).

### 2. Initialise git locally and push

From a terminal in the project folder
(`C:\Users\charles\OneDrive - NORTHBRIDGE CAPITAL\Documents\Claude\Projects\Rollup AI`):

```bash
# init
git init
git branch -M main

# first-time sanity check: confirm listings.json is NOT staged
git add .
git status
#   -> you should see 'docs/listings.json' in the "Changes to be committed" list (good)
#   -> you should NOT see a bare 'listings.json' at the root
#   if you do, STOP and check .gitignore before committing
#
# PowerShell note: if you want to filter the output (like `grep` on Mac/Linux),
# use Select-String:  git status | Select-String -Pattern "listings.json"

git commit -m "initial: industrio site + ingestion pipeline"

# wire remote and push
git remote add origin https://github.com/CharlesJoyce88/industrio.git
git push -u origin main
```

If git asks for credentials, use a GitHub Personal Access Token
(Settings → Developer settings → Personal access tokens → Tokens (classic) →
Generate new token, scope: `repo`). Paste it as the password.

### 3. Turn on GitHub Pages

In the repo on GitHub:

1. **Settings** → **Pages** (left sidebar).
2. **Source:** `Deploy from a branch`.
3. **Branch:** `main`, folder: `/docs`.
4. Click **Save**.

Wait ~30 seconds. The Pages section will then show a green banner with your
live URL:

> **Your site is live at <https://charlesjoyce88.github.io/industrio/>**

Open it. You should see `index.html` from the industrio project.

### 4. (Optional) Custom domain

If/when you own `industrio.ai`:

1. In the repo: **Settings** → **Pages** → **Custom domain** → enter
   `industrio.ai` (or `www.industrio.ai`) → Save.
2. In your DNS: either `ALIAS/ANAME @ -> charlesjoyce88.github.io` (apex) or
   `CNAME www -> charlesjoyce88.github.io`.
3. Back on GitHub Pages, tick **Enforce HTTPS** once the certificate issues
   (~15 minutes).

---

## Publishing an update (the recurring loop)

```bash
# 1. Pull in any new data
python parse-emails.py                         # optional
python import-realm-pdfs.py realm-pdfs/        # optional

# 2. Rebuild /docs with the scrubbed data + any site edits
python scripts/build-public.py

# 3. Commit + push
git add docs/
git commit -m "publish: refresh listings"
git push
```

Pages redeploys within ~30 seconds of the push.

### Flags on build-public.py

```bash
python scripts/build-public.py --dry-run    # show plan, write nothing
python scripts/build-public.py --verbose    # list every file touched
```

---

## Future: automate the loop

A GitHub Action placeholder lives at
`.github/workflows/publish.yml.disabled`. It's intentionally disabled
(the `.disabled` extension stops GitHub from running it) until the
ingestion credentials are configured. When you're ready to automate:

1. Add repository secrets for whatever ingestion sources you want
   (Gmail app password, TRREB API key, etc.) under **Settings → Secrets
   and variables → Actions**.
2. Rename the file:
   `mv .github/workflows/publish.yml.disabled .github/workflows/publish.yml`
3. Commit and push. The Action will run on the schedule in the file.

See the file itself for the exact secrets it expects.

---

## Troubleshooting

**"error: failed to push some refs"** on first push — GitHub created a
default `README.md` when you clicked "Create repository". Pull first:
`git pull origin main --allow-unrelated-histories`, resolve any conflict,
then push.

**404 at the live URL** — GitHub Pages takes up to a minute on the very
first deploy. If it's still 404 after ~2 minutes, check **Settings → Pages**
is set to **Branch: main, Folder: /docs**.

**Pages shows an old version** — Pages caches aggressively. Hard-refresh
the browser (Ctrl+Shift+R). If still stale, check the **Actions** tab in
the repo for the "pages build and deployment" run; make sure it finished
without an error.

**The published map has no dots** — The frontend fetches
`listings.json` with a relative path. Check that `docs/listings.json`
exists and is valid JSON. Open the browser dev tools console; the error
there usually says exactly which URL failed.

**I pushed broker PII by accident** — Immediately: rotate the broker
relationship (apologise to the broker), then purge from history:
```bash
git filter-repo --path docs/listings.json --invert-paths
git push --force-with-lease
```
And fix `scripts/build-public.py` (add the leaked field name to
`PII_FIELDS`) so it never happens again.
