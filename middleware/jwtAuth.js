const crypto = require('node:crypto');

class InvalidTokenError extends Error {}

function decodeJson(part) {
  try {
    const value = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch (err) {
    // fall through
  }
  throw new InvalidTokenError('Malformed token');
}

function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]*$/.test(p))) {
    throw new InvalidTokenError('Malformed token');
  }
  const [headerPart, payloadPart, signaturePart] = parts;

  // Only HS256 is accepted, which also rules out alg "none" and algorithm confusion.
  if (decodeJson(headerPart).alg !== 'HS256') throw new InvalidTokenError('Unsupported algorithm');

  const expected = crypto.createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest();
  const actual = Buffer.from(signaturePart, 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new InvalidTokenError('Invalid signature');
  }

  const payload = decodeJson(payloadPart);
  if (payload.exp !== undefined) {
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now() / 1000) {
      throw new InvalidTokenError('Token expired');
    }
  }
  return payload;
}

function jwtAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: 'Authentication is not configured' });

  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Missing or malformed Authorization header' });

  try {
    req.user = verifyToken(match[1], secret);
  } catch (err) {
    if (!(err instanceof InvalidTokenError)) throw err;
    return res.status(401).json({ error: err.message });
  }
  next();
}

module.exports = { jwtAuth };
