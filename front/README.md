# trip-managment

Frontend for the trip management application.

## Stack

- [Vite](https://vite.dev/) 8
- [React](https://react.dev/) 19
- TypeScript (strict)
- Plain CSS
- [oxlint](https://oxc.rs/) for linting

## Getting started

```
npm install
npm run dev
```

Then open http://localhost:5173.

The backend must run on `http://localhost:3000`: the dev server proxies `/api` to it (the API has no CORS). For a build served without that proxy, set `VITE_API_BASE_URL` (e.g. `https://api.example.com/api`) at build time; it defaults to `/api`.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the dev server with hot reload. |
| `npm run build` | Type-check (`tsc -b`) and build for production into `dist/`. |
| `npm run lint` | Run oxlint. |
| `npm run preview` | Serve the production build locally. |

## Project structure

See [src/README.md](src/README.md) for the folder layout and coding conventions.
