## Development

When starting the dev server, use background mode:

```
pnpm run dev --background
```

Manage the background server with `pnpm run astro dev stop`, `pnpm run astro dev status`, and `pnpm run astro dev logs`. Note: the `astro` binary is not on the global PATH — always run it via pnpm.

## Next steps / to-dos

When the user asks for "what's next", what to work on, or for a to-do list, consult
[`docs/roadmap.md`](docs/roadmap.md) **first**. Keep its statuses in sync as work
progresses and record new decisions there during sessions.

## Previewing layout changes

When a prompt contains "preview layout" (or is otherwise a layout preview request):

- Make the requested code changes but **do NOT commit and do NOT deploy** — the user wants to check it on mobile first.
- After the changes, start the dev server exposed on the LAN so it can be opened on a mobile device:

  ```
  pnpm run dev --host --background
  ```

- Get the LAN URL (printed after start, or via `pnpm run astro dev status`) and tell the user to open it on their phone. Offer any cleanup steps (e.g. `pnpm run astro dev stop`) when done.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
