# Error reports Worker

When the game catches an error it sends a small report here (see `reportError()` in
`index.html`), so you can read what went wrong on a player's screen later.
The report holds the error message and stack, which room and level the player was in,
the input method, the browser's user agent and the page's `document.lastModified`
(which deploy of the game it was). Nothing about the player.

## Deploy (once, about five minutes)

You need a free Cloudflare account and Node. From the `worker/` folder:

```bash
npx wrangler login                                   # opens the browser to sign in
npx wrangler d1 create lop-errors                    # prints a database_id
#   → paste that id into wrangler.toml (database_id = "…")
npx wrangler d1 execute lop-errors --remote --file schema.sql
npx wrangler secret put READ_TOKEN                   # choose a password for the reports page
npx wrangler deploy                                  # prints the Worker URL, e.g. https://lop-errors.<you>.workers.dev
```

Then in `index.html` set `ERROR_LOG_URL` to that URL plus `/report`, commit, and push.

## Reading the reports

Open `https://lop-errors.<you>.workers.dev/?token=<your READ_TOKEN>`. Identical errors are
grouped with a count, first/last seen, the rooms they happened in and the builds.
`/errors.json?token=…` gives the raw rows.

## Updating the Worker

Edit `src/index.js` and run `npx wrangler deploy` again. `node test/worker.js` from the
repository root exercises it locally with a fake database.

## Testing locally

Add `http://localhost:8000` to `ALLOWED_ORIGINS` in `wrangler.toml` (comma-separated), redeploy,
and point `ERROR_LOG_URL` at the Worker while running `python3 -m http.server 8000`.
