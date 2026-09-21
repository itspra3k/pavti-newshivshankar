# न्यु शिव शंकर गणेश उत्सव मंडळ – पावती व्यवस्थापन

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `AUTH_SECRET`.
3. In MongoDB Atlas/Compass create database `ganesh_mandal_pavti` and collection `users`.
4. Insert the five login documents shown below.
5. `npm start` and open `http://localhost:5000`.

## Login users
All five users use the same password requested by the client: `newshivshankar@1982`.

```json
{ "username": "Chetan", "password": "newshivshankar@1982" }
{ "username": "Sumit", "password": "newshivshankar@1982" }
{ "username": "Vaibhav", "password": "newshivshankar@1982" }
{ "username": "Rupesh", "password": "newshivshankar@1982" }
{ "username": "Pratik", "password": "newshivshankar@1982" }
```

## Vercel environment variables
Set `MONGODB_URI`, `MONGODB_DB_NAME=ganesh_mandal_pavti`, and a strong random `AUTH_SECRET`. `PORT` is not needed on Vercel.

## Receipt numbering reset
The sequence lives in `ganesh_mandal_pavti.counters` in document `{ "_id": "receiptNo", "seq": N }`. To start a brand-new receipt series, first remove the old test receipts, then edit `seq` to `0`. If old receipts remain, resetting the counter can collide with the unique `receiptNo` index.
