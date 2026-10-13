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

## Development

The project includes validation utilities in `validate.js` with corresponding test coverage in `validate.test.js`.

## Items API

In-memory CRUD endpoints (data is lost on restart):

| Method | Path | Description |
| --- | --- | --- |
| GET | `/items?offset=&limit=` | List items (`{ total, items }`); `limit` defaults to 20 and is capped at 100. Response headers: `X-Total-Count` (total items) and `Link` (RFC 8288 `next`/`prev`, present when applicable) |
| POST | `/items` | Create an item (`name` required, `description` optional) |
| GET | `/items/:id` | Get one item |
| PUT | `/items/:id` | Replace an item |
| PATCH | `/items/:id` | Update `name` and/or `description` |
| DELETE | `/items/:id` | Delete an item (204) |

## Error handling

All errors are handled by the middleware in `errors.js` and returned as JSON `{ "error": "<message>" }`.

- Unknown routes return `404`; malformed JSON returns `400`; oversized bodies return `413`.
- Handlers can `next(new HttpError(status, message, details))` (or throw synchronously) to send a specific 4xx. `details`, if given, is included in the response for 4xx only.
- Any other error is logged server-side and returned as `500`. For every 5xx the body is `{ "error": "Internal server error" }`, so internals are never leaked.
