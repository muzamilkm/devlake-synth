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
