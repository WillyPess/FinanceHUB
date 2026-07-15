const express = require("express");
const rateLimit = require("express-rate-limit");

const REFRESH_COOKIE_NAME = "refresh_token";

function createAuthRouter(auth, { isProduction }) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again in a minute." },
  });

  function setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/auth",
      maxAge: auth.REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  }

  function clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/auth" });
  }

  router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = await auth.getUserByEmail(String(email).trim().toLowerCase());
    // Always run a bcrypt compare, even for an unknown email, so response time can't leak which emails exist.
    const passwordMatches = auth.verifyPassword(password, user ? user.hashed_password : auth.DUMMY_HASH);

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const accessToken = auth.signAccessToken(user);
    const refreshToken = auth.signRefreshToken(user);
    await auth.setRefreshTokenHash(user.id, refreshToken);
    setRefreshCookie(res, refreshToken);

    res.json({ accessToken, user: { id: user.id, email: user.email } });
  });

  router.post("/refresh", async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let payload;
    try {
      payload = auth.verifyToken(token);
    } catch (_error) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = payload.type === "refresh" ? await auth.getUserById(payload.sub) : null;
    if (!user || user.refresh_token_hash !== auth.hashToken(token)) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Not authenticated" });
    }

    const accessToken = auth.signAccessToken(user);
    const newRefreshToken = auth.signRefreshToken(user);
    await auth.setRefreshTokenHash(user.id, newRefreshToken);
    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken });
  });

  router.post("/logout", async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      try {
        const payload = auth.verifyToken(token);
        if (payload?.sub) await auth.setRefreshTokenHash(payload.sub, null);
      } catch (_error) {
        // Token was already invalid/expired — nothing to revoke.
      }
    }
    clearRefreshCookie(res);
    res.json({ ok: true });
  });

  router.get("/me", auth.requireAuth, async (req, res) => {
    const user = await auth.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ id: user.id, email: user.email });
  });

  return router;
}

module.exports = { createAuthRouter };
