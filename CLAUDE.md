# DSA

Astro static site of interactive DSA labs, live at https://dsa.siddhantota.in.
How the repo is laid out and how to add a topic: see README.md.

## Every change goes live

The owner wants every change shipped, not left in the working tree. After any change to this repo:

1. `npm run build` and make sure it passes. Don't ship a broken build.
2. Commit with a clear message and `git push origin main`. Committing straight to `main` is the
   normal workflow here; no branch or PR unless asked.
3. Deploys are automatic: Cloudflare Pages builds every push to `main`. There is nothing to run by
   hand. Confirm the deploy finished by waiting for the "Cloudflare Pages" check on the pushed commit:

   ```sh
   gh api repos/uncleSlayer/realdsa/commits/<sha>/check-runs \
     --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'
   ```

   It usually takes about a minute. If it fails, open its `details_url` and fix the build.
4. Tell the owner it's live, or why it isn't.
