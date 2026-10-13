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

## Deployment

The `deploy-production` workflow (`.github/workflows/deploy.yml`) runs on every push to `main`. It runs `npm test`, then fails the deploy if the head commit message contains the literal marker `[deploy-fail]`. Branch names and PR titles end up in merge commit subjects, so do not use that marker in branch names or PR titles that will be merged to `main`.

## Development

The project includes validation utilities in `validate.js` with corresponding test coverage in `validate.test.js`.

## Items API

In-memory CRUD endpoints (data is lost on restart):

| Method | Path | Description |
| --- | --- | --- |
| GET | `/items?offset=&limit=&name=&minPrice=&maxPrice=` | List items (`{ total, items }`); `limit` defaults to 20 and is capped at 100. Optional filters: `name` (case-insensitive substring) and `minPrice`/`maxPrice` (inclusive; items without a price are excluded when either is set). `total` counts filtered items. Response headers: `X-Total-Count` (total matching items) and `Link` (RFC 8288 `next`/`prev`, present when applicable, preserving filters) |
| POST | `/items` | Create an item (`name` required; `description` and `price` (non-negative number) optional). Requires `Authorization: Bearer <JWT>` (HS256, signed with `JWT_SECRET`); responds 401 for missing, malformed, expired or badly signed tokens |
| GET | `/items/:id` | Get one item |
| PUT | `/items/:id` | Replace an item |
| PATCH | `/items/:id` | Update any of `name`, `description`, `price` |
| DELETE | `/items/:id` | Delete an item (204) |

## Users API

In-memory user registration (data is lost on restart). Code lives in `users/`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/users/register` | Register a user from `{ email, password }`. Returns 201 with `{ id, email, createdAt }` |

- `email` must be a valid address (max 254 characters); it is trimmed and lowercased, and must be unique (409 otherwise).
- `password` must be 8-128 characters with a lowercase letter, an uppercase letter, a digit and a special character, must not start or end with whitespace, and must not contain the email.
- Validation failures return 400 with `{ error: 'Validation failed', details: [{ field, message }] }`.
- Passwords are stored as salted `scrypt` hashes (Node `crypto`); neither the password nor the hash is ever returned.

## Error handling

All errors are handled by the middleware in `errors.js` and returned as JSON `{ "error": "<message>" }`.

- Unknown routes return `404`; malformed JSON returns `400`; oversized bodies return `413`.
- Handlers can `next(new HttpError(status, message, details))` (or throw synchronously) to send a specific 4xx. `details`, if given, is included in the response for 4xx only.
- Any other error is logged server-side and returned as `500`. For every 5xx the body is `{ "error": "Internal server error" }`, so internals are never leaked.
