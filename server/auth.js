const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./db");

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = "7d";
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function resolveSecretKey() {
  const key = process.env.SECRET_KEY;
  if (key) {
    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SECRET_KEY environment variable is required in production. Generate one with: openssl rand -hex 32"
    );
  }

  console.warn(
    "[auth] SECRET_KEY is not set — using a random key for this run only. " +
    "Every restart will invalidate existing sessions. Set SECRET_KEY in your .env file (see README)."
  );
  return crypto.randomBytes(32).toString("hex");
}

const SECRET_KEY = resolveSecretKey();
// Used to run a bcrypt comparison even when no user matches, so login timing doesn't reveal whether an email exists.
const DUMMY_HASH = bcrypt.hashSync("no-such-user", 12);

function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, type: "access" }, SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: "refresh" }, SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
}

function createAuth() {
  async function getUserByEmail(email) {
    return db.get("SELECT * FROM users WHERE email = ?", [email]);
  }

  async function getUserById(id) {
    return db.get("SELECT * FROM users WHERE id = ?", [id]);
  }

  async function countUsers() {
    const row = await db.get("SELECT COUNT(*) AS count FROM users");
    return row.count;
  }

  async function createUser(email, password) {
    const result = await db.run(
      "INSERT INTO users (email, hashed_password) VALUES (?, ?)",
      [email, hashPassword(password)]
    );
    return getUserById(result.lastInsertRowid);
  }

  async function setRefreshTokenHash(userId, refreshToken) {
    await db.run("UPDATE users SET refresh_token_hash = ? WHERE id = ?", [
      refreshToken ? hashToken(refreshToken) : null,
      userId,
    ]);
  }

  function requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const payload = verifyToken(token);
      if (payload.type !== "access") {
        return res.status(401).json({ error: "Not authenticated" });
      }
      req.user = { id: payload.sub, email: payload.email };
      return next();
    } catch (_error) {
      return res.status(401).json({ error: "Not authenticated" });
    }
  }

  return {
    getUserByEmail,
    getUserById,
    countUsers,
    createUser,
    setRefreshTokenHash,
    hashToken,
    verifyPassword,
    signAccessToken,
    signRefreshToken,
    verifyToken,
    requireAuth,
    REFRESH_TOKEN_TTL_SECONDS,
    DUMMY_HASH,
  };
}

module.exports = { createAuth };
