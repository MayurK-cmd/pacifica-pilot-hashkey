const crypto = require("crypto");

const ALGO   = "aes-256-cbc";
const SECRET = process.env.ENCRYPTION_SECRET || "";

function getKey() {
  // Derive a 32-byte key from the secret
  return crypto.createHash("sha256").update(SECRET).digest();
}

function encrypt(plain) {
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

function decrypt(stored) {
  const [ivHex, encHex] = stored.split(":");
  const iv  = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };