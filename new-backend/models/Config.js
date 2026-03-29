const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  userId:              { type: String, default: "default", unique: true },
  symbols:             { type: [String], default: ["BTC","ETH"] },
  loopIntervalSeconds: { type: Number, default: 300 },
  maxPositionUsdc:     { type: Number, default: 50 },
  minConfidence:       { type: Number, default: 0.6 },
  dryRun:              { type: Boolean, default: true },
  riskLevel:           { type: String, enum: ["conservative","balanced","aggressive"], default: "balanced" },
  enabled:             { type: Boolean, default: false },
  stopLossPct:         { type: Number, default: 3.0 },
  takeProfitPct:       { type: Number, default: 6.0 },
  useBinanceFallback:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Config", configSchema);