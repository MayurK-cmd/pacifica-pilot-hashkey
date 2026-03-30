const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middleware/auth");
const { encrypt, decrypt } = require("../middleware/crypto");
const User = require("../models/User");

// POST /api/auth/sync
// Called by frontend right after Privy login — syncs email + wallet into our DB
router.post("/sync", requireAuth, async (req, res) => {
  try {
    const { email, walletAddress } = req.body;
    const update = {};
    if (email)         update.email         = email;
    if (walletAddress) update.walletAddress  = walletAddress;

    const user = await User.findByIdAndUpdate(
      req.user._id, { $set: update }, { new: true }
    ).select("-pacificaPrivateKey -pacificaApiKey");

    res.json({ user, onboarded: user.onboarded });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/keys
// Saves encrypted Pacifica private key (and optional API key) — onboarding step
router.post("/keys", requireAuth, async (req, res) => {
  try {
    const { pacificaPrivateKey, pacificaApiKey, pacificaAddress } = req.body;

    if (!pacificaAddress) {
      return res.status(400).json({ error: "pacificaAddress (Solana main wallet pubkey) is required" });
    }
    if (!pacificaPrivateKey) {
      return res.status(400).json({ error: "pacificaPrivateKey is required" });
    }

    const update = {
      pacificaAddress,                            // plain — it's a public key
      pacificaPrivateKey: encrypt(pacificaPrivateKey),
      onboarded: true,
    };
    if (pacificaApiKey) update.pacificaApiKey = encrypt(pacificaApiKey);

    await User.findByIdAndUpdate(req.user._id, { $set: update });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me
// Returns current user's profile (no keys)
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-pacificaPrivateKey -pacificaApiKey");
  res.json(user);
});


router.post("/wallet", requireAuth, async (req, res) => {
  try {
    const { pacificaAddress } = req.body;
    if (!pacificaAddress || !pacificaAddress.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      return res.status(400).json({ error: "Invalid Solana address" });
    }
    await User.findByIdAndUpdate(req.user._id, { $set: { pacificaAddress } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;