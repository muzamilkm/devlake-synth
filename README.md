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
| GET | `/items?offset=&limit=&name=&minPrice=&maxPrice=` | List items (`{ total, items }`); `limit` defaults to 20 and is capped at 100. Optional filters: `name` (case-insensitive substring) and `minPrice`/`maxPrice` (inclusive; items without a price are excluded when either is set). `total` counts filtered items. Response headers: `X-Total-Count` (total matching items) and `Link` (RFC 8288 `next`/`prev`, present when applicable, preserving filters) |
| POST | `/items` | Create an item (`name` required; `description` and `price` (non-negative number) optional) |
| GET | `/items/:id` | Get one item |
| PUT | `/items/:id` | Replace an item |
| PATCH | `/items/:id` | Update any of `name`, `description`, `price` |
| DELETE | `/items/:id` | Delete an item (204) |
