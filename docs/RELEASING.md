# Releasing `svelte-excalidraw` to npm (GitLab CI)

## Why you only see a `main` pipeline (no npm job)

`publish-npm-release` runs only when **`CI_COMMIT_TAG`** matches `v*.*.*` (e.g. `v0.1.0`). That requires a **tag pipeline** on **GitLab**, not only a branch push.

If the repo is **mirrored GitHub → GitLab**, many mirrors **do not copy tags** by default. You then get **pipelines for `main`** but **no pipeline for `v0.1.0`** because GitLab never sees the tag.

### Fix (pick one)

1. **Push the tag to GitLab’s git remote** (not only GitHub):

   ```bash
   git remote -v   # find URL for gitlab.tips.dev (or your GitLab clone URL)
   git push <gitlab-remote> v0.1.0
   ```

2. **Or** in GitLab: **Settings → Repository → Mirroring repositories** → enable mirroring **tags** (wording varies by version).

3. **Or** create the tag in GitLab: **Code → Tags → New tag** on the commit you want.

### Check

On GitLab: **Code → Tags** — **`v0.1.0`** must appear. Then open **Build → Pipelines** and filter by tag **`v0.1.0`**; you should see **build** + **publish-npm-release**.

## Release checklist

1. **`NPM_TOKEN`** in **Settings → CI/CD → Variables** (npm automation token, publish scope).
2. **`packages/svelte-excalidraw/package.json`** version = what you want on npm.
3. Commit on **`main`**, push **`main`** to GitLab.
4. **`git tag vX.Y.Z`** on that commit, **push the tag to GitLab** (see above).

```bash
git push <gitlab-remote> main
git push <gitlab-remote> v0.1.0   # or --force if you moved the tag
```

## If `0.1.0` is already on npm

Bump version (e.g. `0.1.1`), commit, tag **`v0.1.1`**, push tag to GitLab.
