const { PrivyClient } = require("@privy-io/server-auth");
const User = require("../models/User");
const Config = require("../models/Config");

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ error: "No token" });

    // Verify with Privy
    const claims = await privy.verifyAuthToken(token);
    const privyUserId = claims.userId;

    // Find or create user doc
    let user = await User.findOne({ privyUserId });
    if (!user) {
      user = await User.create({ privyUserId });
      // Auto-create a default config for them
      await Config.create({ userId: user._id });
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { requireAuth, privy };