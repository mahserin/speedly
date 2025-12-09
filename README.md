**Overview**

- **Project**: `speedly` — a lightweight express utility framework that bundles auth middlewares, database model handlers, file uploader helpers, request validators, API documentation loader and small utilities to speed up building REST APIs.
- **Entry point exports**: `auth`, `db`, `uploader`, `validator`, `models`, `modules`, `utils`, `document` (see below for details and examples).

**Quick Start**

- **Install**: add the project to your workspace or import the package in your service.
- **Basic server skeleton**:

```
import express from 'express'
import { auth, db, uploader, validator, models, modules, utils, document } from './src'

const app = express();
app.use(express.json());

// Mount example module router
app.use('/api/translation', modules.translation);

// Swagger docs (served at /docs)
document(app, require('path').join(process.cwd(), 'src/modules'));

app.listen(3000);
```

**Exports Reference**

**`auth`**

- **Type**: default export (object)
- **Purpose**: Provides simple express middlewares for access control. Each function returns an Express middleware that inspects the request using a configurable `customValidator` (from `getConfig('auth')`) and either allows, forbids or rejects the request.
- **API**:
  - `auth.user()` → middleware that enforces a `user` access type.
  - `auth.admin(config?)` → middleware for admin access. Optionally pass `{ permission }` to require a specific admin permission (the middleware names themselves include the permission, e.g. `auth:admin:PERM`).
  - `auth.any()` → middleware that accepts any authenticated-type logic configured by the `customValidator`.
- **Notes**: `auth` reads default options from `getConfig('auth')`. The `customValidator` should return truthy to allow or falsy to forbid; `null` is treated as unauthorized.

**`db`**

- **Type**: default export (factory function)
- **Purpose**: Creates Express middlewares that operate on a Mongoose model (or other model loaded from the `models` path). Designed to simplify CRUD endpoints by composing handler builders like `.find()`, `.create()`, `.findByIdAndUpdate()`, etc.
- **How to use**: call `db(collectionName, config?)` to get a model handler factory, then chain action methods and use the returned function as an Express middleware.
- **Common methods returned by `db('collection')`**:
  - `.find(match = {})`
  - `.create(body = {})`
  - `.updateOne(match, body)`
  - `.updateMany(match, body)`
  - `.deleteOne(match)`
  - `.deleteMany(match)`
  - `.findOne(match)`
  - `.findOneAndUpdate(match, body)`
  - `.aggregate(pipeline)`
  - `.findById(id)`
  - `.findByIdAndUpdate(id, body)`
  - `.findByIdAndDelete(id)`
- **Query behavior**: The produced middleware reads query params like `search`, `filters`, `sort`, `page`, `limit`, and `select` to modify results. Pagination behaviour can be controlled via `getConfig('db')` (e.g., `pagination.quantity`, `pagination.detailed`).
- **Config**: second argument allows overriding `{ path, type: 'internal'|'external', message }`. When `type` is `internal` the loader resolves models relative to the library; when `external` it resolves from the host app and `configs.path`.
- **Example**:

```
// GET /api/translation -> finds translations
app.get('/api/translation', db('translation', { type: 'internal' }).find());

// POST /api/translation -> create translation documents
app.post('/api/translation', db('translation', { type: 'internal' }).create());
```

**`uploader`**

- **Type**: default export (factory)
- **Purpose**: Provides file uploading middlewares built on `multer` and convenience helpers that optionally save media metadata to a `media` collection.
- **Signature**: `uploader(destination = '/image', config?)` returns an object with methods `{ single, array, fields, any, none }` which are wrappers around multer handlers.
- **Config options** (defaults obtained from `getConfig('uploader')`):
  - `saveInDb` (boolean) — whether to persist metadata in a `media` collection
  - `prefix` (string) — prefix for saved filenames
  - `limit` (number) — max upload size in MB
  - `format` (RegExp) — allowed file extensions
  - `path` (string) — base path to save files (default `../../../public` in library defaults)
- **Returned helpers**:
  - `single(fieldName)` — middleware saving a single file and setting the file URL into `req.body[fieldName]`. If `saveInDb` is true it will store a doc in `media` and set `req.mediaId`.
  - `array(fieldName, maxCount)` — accept multiple files and set an array of URLs into `req.body[fieldName]`.
  - `fields(fieldsArray)` — accept mixed fields (multer-style field definitions).
  - `any()` and `none()` — passthrough multer helpers.
- **Example**:

```
app.post('/upload', uploader('/images').single('photo'), (req,res) => {
	res.json({ url: req.body.photo });
});
```

**`validator`**

- **Type**: default export (generic factory)
- **Purpose**: A small wrapper around `yup` to validate `req.body`, `req.params`, and `req.query`. On failure it forwards an error object to `next()` with `status: 405` and a message.
- **Signature**: `validator({ body?: yup.Schema, params?: yup.Schema, query?: yup.Schema })` returns an Express `RequestHandler`.
- **Behavior**: strips unknown fields, assigns validated values back to `req.body`, `req.params`, and `req.query`. The created middleware is annotated with `__validationSchema` (used by automatic documentation generator).
- **Example**:

```
import * as yup from 'yup';
const schema = { body: yup.object({ text: yup.string().required() }) };
app.post('/translate', validator(schema), handler);
```

**`models`**

- **Type**: object containing Mongoose models
- **Currently included**:
  - `translation` — Mongoose model with fields `{ text: String, lang: String, translatedText: String }` and timestamps.
- **Purpose**: Direct access to low-level models for custom operations (e.g., prefetch, caching or complex queries).

**`modules`**

- **Type**: object of `express.Router` instances keyed by module name
- **Included**:
  - `translation` — router defined in `src/modules/translation/translation.routes.ts` with routes:
    - `GET /` → `db('translation', {type:'internal'}).find()`
    - `POST /` → guarded by a simple body `auth` check inside the route and then `create()`
    - `PUT /:id` → `auth.admin()` + `validator(...)` + `findByIdAndUpdate()`
- **Mounting**: `app.use('/api/translation', modules.translation)`

**`utils`**

- **Type**: object of helper utilities
- **Included**:
  - `translator` — a small translation helper that attempts multiple external translation providers and caches successful translations to the `translation` model. Signature: `translator(text = 'unspecified text', lang = 'fa') => Promise<string>`.
- **Behavior**: Normalizes text, looks up local cache (`translation` model), attempts external services (a worker proxy and optionally `one-api`), writes the result to DB, and returns the translated text. Falls back to the formatted original text on failure.

**`document`**

- **Type**: default export (function)
- **Purpose**: Scans `src/modules` routers and mounts a Swagger UI at `/docs` with automatically generated OpenAPI paths and basic security scheme.
- **Signature**: `document(app: Express, baseDir?: string)` — `baseDir` defaults to `path.join(process.cwd(), 'src/module')` in the loader. Use a correct path to your modules folder (e.g., `path.join(process.cwd(), 'src/modules')`).
- **What it detects**: routes, http methods, `yup` validation schemas (to document request bodies), and auth middlewares (to add security hints and descriptions).

**Configuration & Environment**

- Use `getConfig(key)` (internal) to supply runtime options for `auth`, `db`, `uploader`, and `translate` providers. Typical environment keys used by the modules:
  - `JWT_KEY` (used by auth-related configs)
  - `DB_URL` (database connection string if using external db config)
  - `one_api_token` (optional token for the alternate translator provider)

**Examples**

- Mounting everything in a small app:

```
import express from 'express';
import { modules, document } from './src';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/translation', modules.translation);
document(app, path.join(process.cwd(), 'src/modules'));
app.listen(3000);
```

**Developer Notes**

- `db` middleware attaches pagination, `search` and `filters` behavior using `req.query`. Use `type: 'internal'` when you want the model path resolved inside the package, or `external` to resolve from the consumer app.
- `validator` attaches `__validationSchema` to middlewares which `document` uses to generate OpenAPI schemas.
- `uploader` writes files to disk under the configured `path` and returns public URLs prefixed with `/static`.

If you'd like, I can also:

- add usage examples/tests around each exported function
- add API reference tables per-method for `db` handlers
- generate a small example express app under `examples/` using these exports
