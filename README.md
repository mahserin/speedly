# Speedly

A powerful Node.js/TypeScript utility library that provides essential modules for rapid web application development, including authentication, database operations, file uploading, validation, and translation services.

## Features

- 🔐 **Authentication System** - JWT-based authentication with role-based access control
- 🗄️ **Database Management** - MongoDB/Mongoose integration with advanced query building
- 📤 **File Upload Handler** - Multer-based file upload with automatic directory management
- ✅ **Request Validation** - Yup-based schema validation for requests
- 🌐 **Translation Service** - Multi-provider translation with caching support
- 📦 **Dual Module Support** - Both CommonJS and ES Module exports

## Installation

```bash
npm install speedly
```

## Quick Start

```typescript
import { auth, db, uploader, validator } from 'speedly';

// Initialize your Express app with Speedly modules
```

## Modules

### 🔐 Authentication (`auth`)

Provides JWT-based authentication with customizable role management and middleware support.

```typescript
import { auth } from 'speedly';

// Configure authentication
const authConfig = {
  admin: { 
    role: 'ADMIN', 
    model: '../models/admin' 
  },
  jwtSecretEnv: 'JWT_KEY',
  customValidator: (req, key) => {
    // Custom validation logic
    return true;
  }
};

const authMiddleware = auth(authConfig);

// Use in Express routes
app.use('/admin', authMiddleware.useAuth);
```

### 🗄️ Database (`db`)

Advanced MongoDB operations with query building, pagination, and pipeline support.

```typescript
import { db } from 'speedly';

// Configure database
const dbConfig = {
  dbType: "mongodb",
  path: "../models",
  dbEnv: "DB_URL",
  pagination: {
    quantity: 10,
    detailed: true
  }
};

// Use database operations
// Supports complex queries, aggregation pipelines, and automatic pagination
```

### 📤 File Upload (`uploader`)

Multer-based file upload system with automatic directory creation and validation.

```typescript
import { uploader } from 'speedly';

// Configure uploader
const uploadConfig = {
  saveInDb: false,
  prefix: "img_",
  limit: 5,
  format: /png|jpg|webp|jpeg/i
};

const upload = uploader("/uploads/images", uploadConfig);

// Use in Express routes
app.post('/upload', upload.single('file'), (req, res) => {
  // File uploaded successfully
  res.json({ mediaId: req.mediaId });
});
```

### ✅ Validation (`validator`)

Type-safe request validation using Yup schemas.

```typescript
import { validator } from 'speedly';
import * as yup from 'yup';

// Define validation schema
const userSchema = {
  body: yup.object({
    name: yup.string().required(),
    email: yup.string().email().required(),
    age: yup.number().min(18)
  }),
  params: yup.object({
    id: yup.string().required()
  }),
  query: yup.object({
    page: yup.number().default(1)
  })
};

// Use validation middleware
app.post('/users/:id', validator(userSchema), (req, res) => {
  // req.body, req.params, req.query are now validated and typed
});
```

## Configuration

Speedly uses a configuration system that allows you to customize each module. Create configuration files or use environment variables:

### Environment Variables

```bash
# Database
DB_URL=mongodb://localhost:27017/myapp

# JWT Secret
JWT_KEY=your-secret-key

# Translation API (optional)
ONE_API_TOKEN=your-translation-api-token
```

### Configuration Files

Create module-specific configuration by using the `getConfig` utility:

```typescript
// Example configuration structure
const config = {
  auth: {
    jwtSecretEnv: 'JWT_KEY',
    admin: { role: 'ADMIN' }
  },
  db: {
    dbType: 'mongodb',
    pagination: { quantity: 20 }
  },
  uploader: {
    limit: 10,
    format: /png|jpg|jpeg|webp|gif/i
  },
  translate: {
    one_api_token: process.env.ONE_API_TOKEN
  }
};
```

## Advanced Usage

### Database Queries with Pipelines

```typescript
// Complex aggregation pipeline example
const queryState = {
  action: 'aggregate',
  match: { status: 'active' },
  pipeline: [
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $sort: { createdAt: -1 } }
  ]
};
```

### Translation with Caching

The translation module automatically caches translations and supports multiple providers:

```typescript
import { translator } from 'speedly/dist/util/translator';

// Translate text with automatic caching
const translatedText = await translator("Hello World", "fa");
```

## API Reference

### Authentication Module

- `auth(config)` - Creates authentication middleware
- `useAuth` - Express middleware for route protection

### Database Module

- Supports MongoDB operations with Mongoose
- Built-in pagination and query building
- Aggregation pipeline support

### Uploader Module

- `uploader(destination, config)` - Creates multer upload middleware
- Automatic directory creation
- File format validation

### Validator Module

- `validator(schemas)` - Creates validation middleware
- Type-safe validation with Yup
- Supports body, params, and query validation

## Dependencies

- **Express.js** - Web framework
- **Mongoose** - MongoDB object modeling
- **Multer** - File upload handling
- **Yup** - Schema validation
- **jsonwebtoken** - JWT authentication
- **axios** - HTTP client
- **translate** - Translation services

## Development

### Building the Project

```bash
# Build both CommonJS and ES modules
npm run build

# Build CommonJS only
npm run build:cjs

# Build ES modules only
npm run build:esm

# Development mode
npm run dev
```

### Project Structure

```
src/
├── auth/          # Authentication module
├── db/            # Database operations
├── uploader/      # File upload handling
├── validator/     # Request validation
├── util/          # Utility functions
└── model/         # Data models
```

## TypeScript Support

Speedly is written in TypeScript and provides full type definitions. The package exports both CommonJS and ES modules for maximum compatibility.

## License

MIT © MAHSERIN

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For questions and support, please open an issue on the GitHub repository.