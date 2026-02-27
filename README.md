# speedly

A lightweight Express utility framework that bundles auth middlewares, database model handlers, file uploader helpers, request validators, an API documentation loader, and small utilities to speed up building REST APIs.

## Installation

```bash
npm install speedly
```

Install peer dependencies (Express, Mongoose, and Multer are required):

```bash
npm install express mongoose multer
```

## Quick Start

```js
const speedly = require('speedly');
const mongoose = require('mongoose');

const app = speedly();

mongoose.connect('mongodb://localhost:27017/myapp')
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('API docs at   http://localhost:3000/docs');
});
```

Or with ESM:

```js
import speedly from 'speedly';
import mongoose from 'mongoose';

const app = speedly();

await mongoose.connect('mongodb://localhost:27017/myapp');

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

Express middlewares for access control.

```js
const { auth } = require('speedly/kit');

// Require an authenticated user
app.get('/profile', auth.user(), handler);

// Require an admin
app.delete('/post/:id', auth.admin(), handler);

// Require an admin with a specific permission
app.get('/users', auth.admin({ permission: 'OWNER' }), handler);

// Accept any authenticated request
app.get('/dashboard', auth.any(), handler);
```

- `auth.user()` — enforces user-level authentication.
- `auth.admin(config?)` — enforces admin access. Pass `{ permission }` to require a specific permission string (e.g. `'OWNER'`, `'ADMIN'`).
- `auth.any()` — accepts any authenticated request regardless of role.

#### `db`

Creates Express route handlers that run Mongoose operations on a model. Supports pagination, search, sort, and field selection via query params (`?search=`, `?page=`, `?limit=`, `?sort=`, `?select=`).

```js
const { db } = require('speedly/kit');

// GET /posts — list all posts (supports ?search=, ?page=, ?limit=)
app.get('/posts', db('post').find());

// POST /posts — create a new post
app.post('/posts', db('post').create());

// GET /posts/:id — get post by id
app.get('/posts/:id', db('post').findById());

// PUT /posts/:id — update post by id
app.put('/posts/:id', db('post').findByIdAndUpdate());

// DELETE /posts/:id — delete post by id
app.delete('/posts/:id', db('post').findByIdAndDelete());
```

Available methods: `.find()`, `.create()`, `.findOne()`, `.findById()`, `.findByIdAndUpdate()`, `.findByIdAndDelete()`, `.updateOne()`, `.updateMany()`, `.deleteOne()`, `.deleteMany()`, `.findOneAndUpdate()`, `.aggregate()`.

You can pass a callback to build the query dynamically from `req`:

```js
// GET /posts/:slug — find by slug and increment view count
app.get('/posts/:slug',
  db('post').findOneAndUpdate(
    req => ({ slug: req.params.slug }, { $inc: { views: 1 } })
  ).populate('author_id')
);

// POST /posts — create with author set from authenticated user
app.post('/posts',
  auth.admin(),
  db('post').create(req => ({ author_id: req.user._id }))
);
```

Chain `.populate()` and `.select()` to control what is returned:

```js
app.get('/posts',
  db('post').find()
    .populate([{ path: 'author_id', select: '-password' }, 'thumbnail_id'])
);

app.get('/me',
  auth.user(),
  db('user').findOne(req => ({ _id: req.user._id }))
    .populate('role_id')
    .select('-password')
);
```

Pass `{ type: 'internal' }` to resolve speedly's built-in models:

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
  '/posts',
  validator({
    body: yup.object({
      title: yup.string().required(),
      slug:  yup.string().required(),
      status: yup.string().oneOf(['draft', 'published', 'hidden']),
    }),
  }),
  handler
);

// Validate route params
app.put(
  '/posts/:id',
  validator({
    params: yup.object({ id: yup.string().required() }),
    body:   yup.object({ title: yup.string() }),
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

## Examples

### Blog API

A full blog REST API with auth-protected write routes and public read routes.

**`src/modules/blog/blog.validator.js`**

```js
const { validator } = require('speedly/kit');
const yup = require('yup');

const paramId = yup.object({
  id: yup.string().required('id is required'),
});

const schema = yup.object({
  title:        yup.string().required(),
  slug:         yup.string().required().matches(/^[\d\w-]+$/i, 'slug can only contain letters, numbers and dashes'),
  subTitle:     yup.string(),
  content:      yup.string(),
  status:       yup.string().oneOf(['draft', 'published', 'hidden']),
});

exports.post   = { body: schema };
exports.put    = { params: paramId, body: schema };
exports.delete = { params: paramId };
```

**`src/modules/blog/blog.routes.js`**

```js
const express = require('express');
const { auth, db, validator } = require('speedly/kit');
const v = require('./blog.validator');

const router = express.Router();

// Public: list all posts with author and thumbnail populated
router.get('/',
  db('blog').find()
    .populate([{ path: 'author_id', select: '-password' }, 'thumbnail_id'])
);

// Public: get single post by slug and increment view count
router.get('/:slug',
  db('blog').findOneAndUpdate(
    req => ({ slug: req.params.slug }, { $inc: { views: 1 } })
  ).populate([{ path: 'author_id', select: '-password' }, 'thumbnail_id'])
);

// Admin only: create / update / delete
router.post('/',   auth.admin(), validator(v.post),   db('blog').create(req => ({ author_id: req.user._id })));
router.put('/:id', auth.admin(), validator(v.put),    db('blog').findByIdAndUpdate());
router.delete('/:id', auth.admin(), validator(v.delete), db('blog').findByIdAndDelete());

module.exports = router;
```

### User & Auth Routes

Registration, login, and profile routes with OTP flow.

**`src/modules/user/user.routes.js`**

```js
const express = require('express');
const { auth, db, validator } = require('speedly/kit');
const yup = require('yup');

const router = express.Router();

const phoneSchema = yup.object({
  // Iranian mobile format: 11 digits starting with 09 — adjust regex for your region
  phone: yup.string().required().matches(/^09\d{9}$/, 'Enter an 11-digit phone number starting with 09'),
});

// Check phone number and send OTP
router.post('/check-phone',
  validator({ body: phoneSchema }),
  myUserController.checkPhone   // your custom controller
);

// Register / login with OTP
router.post('/register',
  validator({ body: phoneSchema }),
  myUserController.register
);

// Get current user profile
router.get('/me',
  auth.user(),
  db('user').findOne(req => ({ _id: req.user._id }))
    .populate('role_id')
    .select('-password')
);

// Admin: list all users
router.get('/',
  auth.admin({ permission: 'OWNER' }),
  db('user').find()
);

// Admin: create / update / delete user
router.post('/',      auth.admin(), db('user').create());
router.put('/:id',    auth.admin(), db('user').findByIdAndUpdate());
router.delete('/:id', auth.admin(), db('user').findByIdAndDelete());

module.exports = router;
```

### Role Management

CRUD routes for roles, restricted to users with the `OWNER` permission.

**`src/modules/role/role.routes.js`**

```js
const express = require('express');
const { auth, db, validator } = require('speedly/kit');
const yup = require('yup');

const router = express.Router();

const schema = yup.object({
  title:  yup.string().required(),
  access: yup.string().required().oneOf(['OWNER', 'ADMIN', 'EXPERT']),
});

router.get('/',    auth.admin({ permission: 'OWNER' }), db('role').find());
router.post('/',   auth.admin({ permission: 'OWNER' }), validator({ body: schema }), db('role').create());
router.put('/:id', auth.admin({ permission: 'OWNER' }), validator({ body: schema }), db('role').findByIdAndUpdate());
router.delete('/:id', auth.admin({ permission: 'OWNER' }), db('role').findByIdAndDelete());

module.exports = router;
```

### File Upload

```js
const express = require('express');
const { auth, uploader } = require('speedly/kit');

const router = express.Router();

// Single image upload (saves file info to the media collection)
router.post('/image',
  auth.user(),
  uploader('/images', { saveInDb: true, limit: 5 /* max file size in MB */, format: /image\/(jpeg|png|webp)/ }).single('photo'),
  (req, res) => res.json({ url: req.body.photo })
);

// Multiple file upload
router.post('/gallery',
  auth.user(),
  uploader('/images').array('photos', 10),
  (req, res) => res.json({ urls: req.body.photos })
);

module.exports = router;
```

### Putting It All Together

**`src/app.js`**

```js
const speedly = require('speedly');
const mongoose = require('mongoose');
const { translation } = require('speedly/modules');

const blogRoutes = require('./modules/blog/blog.routes');
const userRoutes = require('./modules/user/user.routes');
const roleRoutes = require('./modules/role/role.routes');

const app = speedly();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myapp');

// Built-in translation module
app.use('/api/translation', translation);

// Application routes
app.use('/api/blogs', blogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

app.listen(3000, () => {
  console.log('Running on http://localhost:3000');
  console.log('API docs:   http://localhost:3000/docs');
});
```

---

## License

MIT
