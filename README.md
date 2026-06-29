# Acamar L. Baltazar — Portfolio

A single-page static personal portfolio website. Plain HTML + CSS, served locally by a tiny Express server and deployed to Vercel as static output.

## Local development

```bash
npm install
npm start
```

Then open http://localhost:3001. The server reads `PORT` from the environment, falling back to `3001`.

## Images

Web image assets in `public/img/` and the favicon, apple-touch icon, and social
share card are generated from `resources/profile.jpg` by a build script:

```bash
npm run build:images   # requires the devDependency `sharp`
```

Re-run it whenever the source photo changes. The generated assets are committed,
so the site itself needs no build step to deploy.

## Deploy

Push to a Git repo and import into Vercel, or run `vercel`. No build step; Vercel serves the `public/` directory directly.
