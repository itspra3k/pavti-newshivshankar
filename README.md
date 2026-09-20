# न्यु शिव शंकर गणेश उत्सव मंडळ — पावती व्यवस्थापन

This keeps the supplied single-page Marathi UI and moves receipt storage from the browser-only `window.storage` API to MongoDB Atlas.

## Backend
- Node.js + Express
- MongoDB Atlas via official MongoDB Node driver
- Database: `ganesh_mandal_pavti`
- Collections: `receipts` and `counters`
- API: list, create, edit, delete, next receipt number, health check

## Run locally
1. Install Node.js 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Put your existing Atlas connection string/password in `.env`.
5. Run `npm start`.
6. Open `http://localhost:5000`.

The database and collections can be created automatically on first use. The `counters` collection is created automatically when the first receipt is saved.

## Important
Do not commit `.env` to GitHub. The public single-page UI has no login/authentication; add authentication before public deployment.
