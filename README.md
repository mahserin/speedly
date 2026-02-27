# speedly

A lightweight Express utility framework that bundles auth middlewares, database model handlers, file uploader helpers, request validators, an API documentation loader, and small utilities to speed up building REST APIs.

## Installation

```bash
npm install speedly
```

## Quick Start

```js
const speedly = require('speedly');

const app = speedly();

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

Or with ESM:

```js
import speedly from 'speedly';

const app = speedly();

app.listen(3000);
```

`speedly()` returns a fully configured Express app with JSON parsing, URL-encoded body parsing, static file serving, a home route, a 404 handler, an error handler, and Swagger documentation pre-wired.

### Init options

```js
const app = speedly({
  jsonParser: true,         // default: true
  urlEncodedParser: true,   // default: true
  cookieParser: true,       // default: true
  staticFiles: true,        // default: true — serves /public at /static
  homeHandler: true,        // default: true — GET / returns a welcome page
  notFoundHandler: true,    // default: true
  errorHandler: true,       // default: true
  documentation: true,      // default: true — mounts Swagger UI at /docs
});
```

---

## API Reference

### `speedly/kit` — auth, db, uploader, validator

```js
const { auth, db, uploader, validator } = require('speedly/kit');
```

#### `auth`

Express middlewares for access control. Configure a `customValidator` via your speedly config.

```js
const { auth } = require('speedly/kit');

// Require an authenticated user
app.get('/profile', auth.user(), handler);

// Require an admin
app.delete('/item/:id', auth.admin(), handler);

// Require an admin with a specific permission
app.post('/item', auth.admin({ permission: 'CREATE' }), handler);

// Accept any authenticated request
app.get('/dashboard', auth.any(), handler);
```

- `auth.user()` — enforces `user` access type.
- `auth.admin(config?)` — enforces admin access. Pass `{ permission }` to require a specific permission.
- `auth.any()` — accepts any authenticated request.

#### `db`

Creates Express middlewares that run Mongoose operations on a model. Supports pagination, search, filters, sort, and field selection via query params (`?search=`, `?page=`, `?limit=`, `?sort=`, `?select=`).

```js
const { db } = require('speedly/kit');

// GET /items — find all
app.get('/items', db('item').find());

// POST /items — create
app.post('/items', db('item').create());

// PUT /items/:id — update by id
app.put('/items/:id', db('item').findByIdAndUpdate());

// DELETE /items/:id — delete by id
app.delete('/items/:id', db('item').findByIdAndDelete());
```

Available methods: `.find()`, `.create()`, `.findOne()`, `.findById()`, `.findByIdAndUpdate()`, `.findByIdAndDelete()`, `.updateOne()`, `.updateMany()`, `.deleteOne()`, `.deleteMany()`, `.findOneAndUpdate()`, `.aggregate()`.

Pass `{ type: 'internal' }` to resolve built-in models, or `{ type: 'external' }` to resolve models from your application:

```js
app.get('/translations', db('translation', { type: 'internal' }).find());
```

#### `uploader`

File upload middlewares built on `multer`, with optional metadata persistence to a `media` collection.

```js
const { uploader } = require('speedly/kit');

// Single file upload
app.post('/upload', uploader('/images').single('photo'), (req, res) => {
  res.json({ url: req.body.photo });
});

// Multiple files
app.post('/gallery', uploader('/images').array('photos', 10), (req, res) => {
  res.json({ urls: req.body.photos });
});
```

Config options: `saveInDb`, `prefix`, `limit` (MB), `format` (RegExp), `path`.

#### `validator`

Request validation middleware built on `yup`. Validates `req.body`, `req.params`, and `req.query`.

```js
const { validator } = require('speedly/kit');
const yup = require('yup');

app.post(
  '/translate',
  validator({
    body: yup.object({ text: yup.string().required(), lang: yup.string() }),
  }),
  handler
);
```

On validation failure, calls `next({ status: 405, message: '...' })`.

---

### `speedly/modules` — built-in routers

```js
const { translation } = require('speedly/modules');

app.use('/api/translation', translation);
```

Includes a `translation` router with:
- `GET /` — list translations (supports `?search=`, `?page=`, `?limit=`)
- `POST /` — create a translation
- `PUT /:id` — update a translation (requires admin auth)

---

### `speedly/document` — Swagger UI

Scans your module routers and mounts a Swagger UI at `/docs`.

```js
const document = require('speedly/document');
const path = require('path');

document(app, path.join(process.cwd(), 'src/modules'));
// Visit http://localhost:3000/docs
```

Automatically detects routes, HTTP methods, `yup` validation schemas, and auth middlewares to generate OpenAPI documentation.

---

### `speedly/util` — utilities

```js
const { translator } = require('speedly/util');

const result = await translator('Hello', 'fa');
console.log(result); // translated text
```

`translator(text, lang)` — translates text to the target language, caching results in the `translation` model.

---

### `speedly/model` — Mongoose models

```js
const { translation } = require('speedly/model');

const docs = await translation.find({ lang: 'fa' });
```

Includes the `translation` model with fields: `text`, `lang`, `translatedText`, and timestamps.

---

## Full Example

```js
const speedly = require('speedly');
const { auth, db, uploader, validator } = require('speedly/kit');
const { translation } = require('speedly/modules');
const yup = require('yup');

const app = speedly();

// Mount built-in translation module
app.use('/api/translation', translation);

// Custom route with auth + validation
app.post(
  '/api/items',
  auth.user(),
  validator({ body: yup.object({ name: yup.string().required() }) }),
  db('item').create()
);

// File upload
app.post('/api/upload', uploader('/images').single('photo'), (req, res) => {
  res.json({ url: req.body.photo });
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));
// Swagger docs available at http://localhost:3000/docs
```

## License

MIT
