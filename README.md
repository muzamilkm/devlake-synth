# devlake-synth

Disposable test repository for DevLake production real-user-flow validation (run PVT-20260925-mk01).

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Usage

### Start

To run the application:

```bash
npm start
```

### Test

To run the test suite:

```bash
npm test
```

Unit tests live next to the code; end-to-end tests that boot the real app live in `integration/` (shared client in `integration/helpers.js`, sample data in `integration/fixtures.js`). New `*.test.js` files must be added to the `test` script in `package.json`.

Unsupported methods on a known path return `405` with an `Allow` header, `OPTIONS` returns `204` with `Allow`, and request bodies over 100kb return `413`.

## Deployment

The `deploy-production` workflow (`.github/workflows/deploy.yml`) runs on every push to `main`. It runs `npm test`, then fails the deploy if the head commit message contains the literal marker `[deploy-fail]`. Branch names and PR titles end up in merge commit subjects, so do not use that marker in branch names or PR titles that will be merged to `main`.

## Development

The project includes validation utilities in `validate.js` with corresponding test coverage in `validate.test.js`.

## Items API

In-memory CRUD endpoints (data is lost on restart):

| Method | Path | Description |
| --- | --- | --- |
| GET | `/items?offset=&limit=&name=&minPrice=&maxPrice=&sort=` | List items (`{ total, items }`); `limit` defaults to 20 and is capped at 100. Optional filters: `name` (case-insensitive substring) and `minPrice`/`maxPrice` (inclusive; items without a price are excluded when either is set). `total` counts filtered items. `sort` is `name`, `price` or `createdAt`, prefix `-` for descending (invalid values return 400; items without a price sort last). Response headers: `X-Total-Count` (total matching items) and `Link` (RFC 8288 `next`/`prev`, present when applicable, preserving filters and sort) |
| POST | `/items` | Create an item (`name` required; `description` and `price` (non-negative number) optional). Requires `Authorization: Bearer <JWT>` (HS256, signed with `JWT_SECRET`); responds 401 for missing, malformed, expired or badly signed tokens |
| GET | `/items/:id` | Get one item |
| PUT | `/items/:id` | Replace an item |
| PATCH | `/items/:id` | Update any of `name`, `description`, `price` |
| DELETE | `/items/:id` | Delete an item (204) |

## API documentation

The full API is described by an OpenAPI 3.0 document in `openapi.json`. With the server running, it is served at:

```
GET /openapi.json
```

Load it into Swagger UI, Redoc, Postman or any other OpenAPI tool to browse the endpoints and try requests.

Conventions:

- **Ids** are positive integers and are never reused after delete. An invalid id returns `400`; an unknown id returns `404`.
- **Errors** return a JSON body of the form `{ "error": "..." }`. Malformed JSON bodies return `400` with `Invalid JSON body`.
- **Pagination** on `GET /items` uses `offset` (default `0`) and `limit` (default `20`, capped at `100`). The `X-Total-Count` header always carries the total number of items, and the `Link` header carries RFC 8288 `next`/`prev` relations when there is another page.

### Keeping the spec in sync

`npm test` runs `openapi.test.js`, which fails when:

- a route is added, removed or renamed without a matching change to `openapi.json`,
- a `$ref` points at a schema that does not exist, or a path parameter is not declared,
- a real response uses a status code, required header or body shape that the spec does not document.

When you change an endpoint, update `openapi.json` in the same commit.

## Users API

In-memory user registration (data is lost on restart). Code lives in `users/`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/users/register` | Register a user from `{ email, password }`. Returns 201 with `{ id, email, createdAt }` |

- `email` must be a valid address (max 254 characters); it is trimmed and lowercased, and must be unique (409 otherwise).
- `password` must be 8-128 characters with a lowercase letter, an uppercase letter, a digit and a special character, must not start or end with whitespace, and must not contain the email.
- Validation failures return 400 with `{ error: 'Validation failed', details: [{ field, message }] }`.
- Passwords are stored as salted `scrypt` hashes (Node `crypto`); neither the password nor the hash is ever returned.

## Inventory reports

Pure functions over arrays of items, in `reports/`. Items may carry optional `category`, `price`, `quantity` and `reorderLevel`; missing or invalid numbers count as 0 and a missing category becomes `uncategorized` (categories are trimmed and lowercased).

```js
const { generateReport, exportReport } = require('./reports');
generateReport('low-stock', items, { threshold: 5 });
exportReport('categories', 'csv', items); // { contentType, filename, body }
```

- Report types: `summary`, `low-stock` (options `threshold`, default 10, and `category`; an item's own `reorderLevel` wins), `categories`.
- Formats: `json` and `csv` (CRLF line endings; strings starting with `= + - @` are prefixed with `'` to block spreadsheet formula injection).
- A low-stock CSV with no rows is an empty string.

## Error handling

All errors are handled by the middleware in `errors.js` and returned as JSON `{ "error": "<message>" }`.

- Unknown routes return `404`; malformed JSON returns `400`; oversized bodies return `413`.
- Handlers can `next(new HttpError(status, message, details))` (or throw synchronously) to send a specific 4xx. `details`, if given, is included in the response for 4xx only.
- Any other error is logged server-side and returned as `500`. For every 5xx the body is `{ "error": "Internal server error" }`, so internals are never leaked.
