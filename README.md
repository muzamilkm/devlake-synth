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

### Configuration

Configuration is read from environment variables and validated before the server starts. If a value is invalid, the server prints an error and exits with status 1 without listening.

| Variable | Default | Rules |
| --- | --- | --- |
| `PORT` | `3000` | Optional. When set, must be an integer from 1 to 65535 |

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
