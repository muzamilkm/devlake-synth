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

### Docker

Requires Docker with the Compose plugin. Build and start the API in a container:

```bash
docker compose up --build
```

The API is served on `http://localhost:3000`. To use a different host port, set `PORT`, for example `PORT=8080 docker compose up`. Stop it with `docker compose down`.

To build the image without Compose:

```bash
docker build -t devlake-synth .
docker run --rm -p 3000:3000 devlake-synth
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
