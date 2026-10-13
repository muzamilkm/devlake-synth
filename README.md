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

## Users API

In-memory user registration (data is lost on restart). Code lives in `users/`.

| Method | Path | Description |
| --- | --- | --- |
| POST | `/users/register` | Register a user from `{ email, password }`. Returns 201 with `{ id, email, createdAt }` |

- `email` must be a valid address (max 254 characters); it is trimmed and lowercased, and must be unique (409 otherwise).
- `password` must be 8-128 characters with a lowercase letter, an uppercase letter, a digit and a special character, must not start or end with whitespace, and must not contain the email.
- Validation failures return 400 with `{ error: 'Validation failed', details: [{ field, message }] }`.
- Passwords are stored as salted `scrypt` hashes (Node `crypto`); neither the password nor the hash is ever returned.
