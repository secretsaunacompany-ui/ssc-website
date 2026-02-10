# Secret Sauna Company — Website

Single-page application for [secretsaunacompany.ca](https://secretsaunacompany.ca).

## Stack

- **Frontend:** Static HTML/CSS/JS (SPA with page-show/hide navigation)
- **Build:** Eleventy (Nunjucks templates)
- **Hosting:** Netlify
- **Backend:** Netlify Functions (serverless)
- **Database:** Supabase (analytics, bookings)
- **Images:** Cloudinary CDN
- **Forms:** Formspree

## Local Development

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` trigger automatic Netlify deploys.
