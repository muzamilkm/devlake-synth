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
| POST | `/items/import[?partial=true]` | Bulk create items from a CSV body (`Content-Type: text/csv`) |

### CSV import

The first row is a header with a required `name` column and an optional `description` column (case-insensitive, any order). Fields may be quoted per RFC 4180. Up to 1000 rows and 1 MB per upload.

By default the import is all-or-nothing: if any row is invalid the response is `422` with `errors: [{ row, error }]` (row 1 is the header) and nothing is created. With `?partial=true` valid rows are created (`201`) and invalid ones are reported in `errors`. Header or syntax problems return `400`; a non-CSV content type returns `415`.

```sh
curl -X POST -H 'Content-Type: text/csv' --data-binary @fixtures/valid.csv localhost:3000/items/import
```
