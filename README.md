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
| GET | `/items?offset=&limit=` | List items (`{ total, items }`); `limit` defaults to 20 and is capped at 100. Response headers: `X-Total-Count` (total items) and `Link` (RFC 8288 `next`/`prev`, present when applicable) |
| POST | `/items` | Create an item (`name` required, `description` optional). Requires `Authorization: Bearer <JWT>` (HS256, signed with `JWT_SECRET`); responds 401 for missing, malformed, expired or badly signed tokens |
| GET | `/items/:id` | Get one item |
| PUT | `/items/:id` | Replace an item |
| PATCH | `/items/:id` | Update `name` and/or `description` |
| DELETE | `/items/:id` | Delete an item (204) |
