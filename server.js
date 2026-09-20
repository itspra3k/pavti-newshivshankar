const path = require('path');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'ganesh_mandal_pavti';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000
});

let receiptsCollection;
let countersCollection;

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cleanReceiptInput(body = {}) {
  const name = String(body.name || '').trim();
  const mobile = String(body.mobile || '').trim();
  const address = String(body.address || '').trim();
  const collector = String(body.collector || '').trim();
  const mode = String(body.mode || 'रोख').trim();
  const date = String(body.date || '').trim();
  const amount = Number(body.amount);

  if (!name) throw new Error('देणगीदाराचे नाव आवश्यक आहे.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('योग्य देणगी रक्कम द्या.');
  if (!isValidDate(date)) throw new Error('योग्य दिनांक द्या.');
  if (mobile && !/^\d{10}$/.test(mobile)) throw new Error('मोबाईल नंबर 10 अंकी असावा.');
  if (!['रोख', 'ऑनलाइन/UPI', 'चेक'].includes(mode)) throw new Error('अवैध पेमेंट पद्धत.');

  return { name, mobile, address, collector, mode, date, amount };
}

function serializeReceipt(doc) {
  return {
    id: doc._id.toString(),
    receiptNo: doc.receiptNo,
    date: doc.date,
    name: doc.name,
    mobile: doc.mobile || '',
    address: doc.address || '',
    amount: Number(doc.amount),
    mode: doc.mode,
    collector: doc.collector || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt || null
  };
}

function toObjectId(id) {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (_req, res) => {
  try {
    await client.db('admin').command({ ping: 1 });
    res.json({ ok: true, database: DB_NAME });
  } catch (error) {
    res.status(503).json({ ok: false, error: 'MongoDB connection failed' });
  }
});

app.get('/api/next-receipt-no', async (_req, res) => {
  try {
    const counter = await countersCollection.findOne({ _id: 'receiptNo' });
    res.json({ nextNo: Number(counter?.seq || 0) + 1 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'पावती क्रमांक मिळवता आला नाही.' });
  }
});

app.get('/api/receipts', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const query = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { mobile: { $regex: escaped, $options: 'i' } }
      ];
      if (/^\d+$/.test(search)) {
        query.$or.push({ receiptNo: Number(search) });
      }
    }

    const docs = await receiptsCollection.find(query).sort({ receiptNo: -1 }).toArray();
    res.json(docs.map(serializeReceipt));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'पावत्या मिळवताना त्रुटी आली.' });
  }
});

app.get('/api/receipts/:id', async (req, res) => {
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'अवैध पावती आयडी.' });

    const doc = await receiptsCollection.findOne({ _id });
    if (!doc) return res.status(404).json({ message: 'पावती सापडली नाही.' });

    res.json(serializeReceipt(doc));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'पावती मिळवताना त्रुटी आली.' });
  }
});

app.post('/api/receipts', async (req, res) => {
  try {
    const input = cleanReceiptInput(req.body);

    const counter = await countersCollection.findOneAndUpdate(
      { _id: 'receiptNo' },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );

    const receiptNo = Number(counter.seq);
    const now = new Date();
    const doc = {
      receiptNo,
      ...input,
      createdAt: now,
      updatedAt: null
    };

    const result = await receiptsCollection.insertOne(doc);
    const saved = await receiptsCollection.findOne({ _id: result.insertedId });

    res.status(201).json(serializeReceipt(saved));
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'पावती जतन करता आली नाही.' });
  }
});

app.put('/api/receipts/:id', async (req, res) => {
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'अवैध पावती आयडी.' });

    const input = cleanReceiptInput(req.body);
    const update = { ...input, updatedAt: new Date() };

    const result = await receiptsCollection.updateOne({ _id }, { $set: update });
    if (!result.matchedCount) return res.status(404).json({ message: 'पावती सापडली नाही.' });

    const saved = await receiptsCollection.findOne({ _id });
    res.json(serializeReceipt(saved));
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || 'पावती अपडेट करता आली नाही.' });
  }
});

app.delete('/api/receipts/:id', async (req, res) => {
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) return res.status(400).json({ message: 'अवैध पावती आयडी.' });

    const result = await receiptsCollection.deleteOne({ _id });
    if (!result.deletedCount) return res.status(404).json({ message: 'पावती सापडली नाही.' });

    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'पावती काढताना त्रुटी आली.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  await client.connect();
  const db = client.db(DB_NAME);
  receiptsCollection = db.collection('receipts');
  countersCollection = db.collection('counters');

  await receiptsCollection.createIndex({ receiptNo: 1 }, { unique: true });
  await receiptsCollection.createIndex({ name: 1 });
  await receiptsCollection.createIndex({ mobile: 1 });

  await client.db('admin').command({ ping: 1 });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pavti app running at http://localhost:${PORT}`);
    console.log(`MongoDB database: ${DB_NAME}`);
  });
}

start().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});
