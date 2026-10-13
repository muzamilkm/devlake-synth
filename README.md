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

## API docs

The full API is described by an OpenAPI 3.0 spec in `openapi.json`. While the app is running, it is served at:

```
GET /openapi.json
```

Point any OpenAPI viewer (such as Swagger Editor or Swagger UI) at that URL, or open `openapi.json` directly, to browse request and response schemas, parameters, headers and error responses.

The spec is kept in step with the code: `npm test` runs `openapi.test.js`, which fails if a route is added or removed without a matching change to `openapi.json`. When you change an endpoint, update the spec in the same commit.
