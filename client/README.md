# Swordbattle.io client

The browser client is built with Vite, React, and TypeScript. Install the monorepo once from the repository root with `pnpm install`, then run `pnpm dev:client` for the development server or `pnpm build:client` for a production build in `client/build`.

Runtime assets stay in `public/`. Shared game enums and the canonical protobuf schema live in `packages/shared`; regenerate the typed client protocol with `pnpm --filter swordbattle.io-client build-protocol` after changing that schema.
