"""
strategy.py — Gemini 2.5 Flash trading decisions with account context.

Improvements over v1:
  - Gemini prompt uses pre-computed RSI signals ("oversold"/"neutral"/"overbought")
    instead of raw numbers — null RSI no longer confuses the model
  - Basis spread (Pacifica vs Binance) included in prompt as an extra signal
  - Balance-gating unchanged: HOLD if available_to_spend < min_order
  - Fallback rule engine explicitly gates on RSI signal strings
"""

import os, json
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SYSTEM_PROMPT = """
You are PacificaPilot — an autonomous trading agent for Pacifica perpetual futures markets.
You receive market data, social sentiment, and the user's live account state.
Decide: LONG, SHORT, or HOLD.

Signal interpretation:
- RSI signal (5m = timing, 1h = trend):
    "oversold"   → price likely depressed, lean LONG
    "neutral"    → no RSI edge, lean HOLD unless other signals align
    "overbought" → price likely extended, lean SHORT
    "unavailable"→ treat as neutral; do not use RSI for this decision
- Multi-timeframe rule: if 1h and 5m signals conflict, 1h takes precedence for direction;
  5m signal only used to improve entry timing within the 1h trend.
- Funding rate: neutral if |rate| < 0.0001.
  Positive → longs crowded → slight bearish tilt.
  Negative → shorts crowded → slight bullish tilt.
- Sentiment: engagement-based (not polarity). High engagement can be FUD or hype.
  Weight at most 20% of total decision.
- Basis spread (Pacifica mark vs Binance spot):
    "premium"  → Pacifica trades above spot — shorts slightly more attractive, longs face headwind
    "discount" → Pacifica trades below spot — longs slightly more attractive
    "normal"   → ignore
    "unavailable" → ignore
  If basis_alert is True (spread > 2%), increase weight of basis signal.

Account rules:
- If available_to_spend < order_size_usdc → HOLD (not enough collateral).
- If available_to_spend < 10 → always HOLD.
- Factor existing open positions when sizing — don't overextend.

Sizing:
- size_pct 0.25 = weak signal, 0.5 = moderate, 0.75-1.0 = strong confluence of signals.
- Default to HOLD when signals conflict or confidence < 0.55.

Respond ONLY with valid JSON, no markdown:
{
  "action": "LONG" | "SHORT" | "HOLD",
  "confidence": 0.0 to 1.0,
  "reasoning": "2-3 plain English sentences a non-expert can understand",
  "size_pct": 0.25 | 0.5 | 0.75 | 1.0
}
"""


def _response_text(response) -> str:
    t = getattr(response, "text", None)
    if t:
        return t.strip()
    cands = getattr(response, "candidates", None) or []
    if cands:
        parts = getattr(cands[0].content, "parts", None) or []
        if parts:
            return getattr(parts[0], "text", "").strip()
    return ""


def _normalize(raw: dict, market: dict) -> dict:
    action = str(raw.get("action", "HOLD")).upper()
    if action not in ("LONG", "SHORT", "HOLD"):
        action = "HOLD"
    try:
        conf = float(raw.get("confidence", 0.5))
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(1.0, conf))
    try:
        size = float(raw.get("size_pct", 0.5))
    except (TypeError, ValueError):
        size = 0.5
    size = min((0.25, 0.5, 0.75, 1.0), key=lambda x: abs(x - size))
    return {
        "action":     action,
        "confidence": conf,
        "reasoning":  str(raw.get("reasoning", "No reasoning provided.")),
        "size_pct":   size,
        "symbol":     market["symbol"],
        "mark_price": market["mark_price"],
    }


def _format_spot_balances(spot_balances: list) -> str:
    if not spot_balances:
        return "None"
    return ", ".join(
        f"{b['symbol']}: {b['amount']}"
        for b in spot_balances
        if b.get("amount", 0) > 0
    )


def decide(
    market: dict,
    sentiment: dict,
    account_context: dict = None,
    max_position_usdc: float = 50.0,
) -> dict:
    """
    account_context: {
        usdcBalance, accountEquity, spotCollateral,
        availableToSpend, usedMargin, spotBalances
    }
    max_position_usdc: from user config
    """
    # Pre-computed signal labels (never null — market.py guarantees this)
    rsi_5m_signal = market.get("rsi_5m_signal", "unavailable")
    rsi_1h_signal = market.get("rsi_1h_signal", "unavailable")
    # Raw values only for display
    rsi_5m_raw = market.get("rsi_14")
    rsi_1h_raw = market.get("rsi_1h")
    rsi_5m_str = f"{rsi_5m_raw:.2f}" if rsi_5m_raw is not None else "N/A"
    rsi_1h_str = f"{rsi_1h_raw:.2f}" if rsi_1h_raw is not None else "N/A"
    funding    = market.get("funding_rate", 0) or 0

    # Basis spread section
    basis_pct    = market.get("basis_pct")
    basis_signal = market.get("basis_signal", "unavailable")
    basis_alert  = market.get("basis_alert", False)
    basis_str    = (
        f"{basis_pct:+.2f}% ({basis_signal}){' ⚠ ALERT' if basis_alert else ''}"
        if basis_pct is not None else "unavailable"
    )
    binance_spot = market.get("binance_spot")
    spot_str     = f"${binance_spot:,.2f}" if binance_spot else "N/A"

    # Account section
    if account_context:
        available   = account_context.get("availableToSpend", 0)
        equity      = account_context.get("accountEquity", 0)
        usdc_bal    = account_context.get("usdcBalance", 0)
        used_margin = account_context.get("usedMargin", 0)
        spot_bal    = _format_spot_balances(account_context.get("spotBalances", []))
        account_section = f"""
Account state:
- USDC balance:       ${usdc_bal:,.2f}
- Account equity:     ${equity:,.2f}
- Available to spend: ${available:,.2f}  ← key constraint
- Used margin:        ${used_margin:,.2f}
- Spot holdings:      {spot_bal}
- Max order size:     ${max_position_usdc:,.2f}
"""
    else:
        account_section = "Account state: unavailable\n"

    user_msg = f"""
Market: {market['symbol']}
- Mark price:       ${market['mark_price']:,.2f}
- Binance spot:     {spot_str}
- Basis spread:     {basis_str}   (Pacifica mark vs Binance spot)
- 24h change:       {market['change_24h']:.2f}%
- RSI-14 (5m):      {rsi_5m_str}  → signal: {rsi_5m_signal}
- RSI-14 (1h):      {rsi_1h_str}  → signal: {rsi_1h_signal}
- Funding rate:     {funding:.6f}  (neutral if |rate| < 0.0001)
- Volume 24h:       ${market.get('volume_24h', 0):,.0f}

Social sentiment (Elfa AI — engagement strength, not polarity):
- Score:            {sentiment['sentiment_score']:+.3f}  (0=none, 1=very high)
- Mentions (24h):   {sentiment['mention_count']}
- Trending rank:    {sentiment['trending_score']:.0f}/100
- Summary:          {sentiment['summary']}

Open position:      {market.get('open_position', 'None')}
Unrealised PnL:     {market.get('unrealized_pnl', 'N/A')}
{account_section}
What is your trading decision?
"""

    if not GEMINI_API_KEY:
        return _fallback(market, sentiment, account_context, max_position_usdc)

    try:
        client   = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_msg,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.25,
            ),
        )
        text = _response_text(response)
        if not text:
            raise ValueError("Empty response from Gemini")
        if "```" in text:
            parts = text.split("```")
            text  = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        return _normalize(json.loads(text.strip()), market)
    except Exception as e:
        print(f"[Strategy] Gemini failed for {market['symbol']}: {e} — using fallback")
        return _fallback(market, sentiment, account_context, max_position_usdc)


def _fallback(
    market: dict,
    sentiment: dict,
    account_context: dict = None,
    max_position_usdc: float = 50.0,
) -> dict:
    """
    Rule-based fallback. Uses RSI signal strings (not raw numbers) so behaviour
    is identical whether RSI data is available or not.
    """
    rsi_5m_signal = market.get("rsi_5m_signal", "unavailable")
    rsi_1h_signal = market.get("rsi_1h_signal", "unavailable")
    # Keep raw for fine-grained numeric thresholds where available
    rsi_5m  = market.get("rsi_14") or 50.0
    rsi_1h  = market.get("rsi_1h") or rsi_5m
    sent    = sentiment.get("sentiment_score", 0.0) or 0.0
    funding = market.get("funding_rate", 0.0) or 0.0

    # Balance check — don't act if not enough free collateral
    if account_context:
        available = account_context.get("availableToSpend", 0)
        min_order = max_position_usdc * 0.25
        if available < min_order:
            return {
                "action":     "HOLD",
                "confidence": 1.0,
                "reasoning":  (
                    f"Insufficient collateral — ${available:.2f} available, "
                    f"minimum order is ${min_order:.2f}."
                ),
                "size_pct":   0.0,
                "symbol":     market["symbol"],
                "mark_price": market["mark_price"],
            }

    FUNDING_THRESHOLD = 1e-4
    action     = "HOLD"
    confidence = 0.45
    size_pct   = 0.25
    signals    = []

    long_score  = 0
    short_score = 0

    # 1h signal drives trend direction (weight 3)
    if rsi_1h_signal == "oversold":
        long_score += 3; signals.append(f"1h RSI oversold ({rsi_1h:.1f})")
    elif rsi_1h_signal == "neutral" and rsi_1h < 45:
        long_score += 1; signals.append(f"1h RSI low-neutral ({rsi_1h:.1f})")
    elif rsi_1h_signal == "overbought":
        short_score += 3; signals.append(f"1h RSI overbought ({rsi_1h:.1f})")
    elif rsi_1h_signal == "neutral" and rsi_1h > 55:
        short_score += 1; signals.append(f"1h RSI high-neutral ({rsi_1h:.1f})")

    # 5m signal refines timing (weight 2)
    if rsi_5m_signal == "oversold":
        long_score += 2; signals.append(f"5m RSI oversold ({rsi_5m:.1f})")
    elif rsi_5m_signal == "overbought":
        short_score += 2; signals.append(f"5m RSI overbought ({rsi_5m:.1f})")
    # "unavailable" contributes nothing — no phantom signals

    # Funding
    if funding < -FUNDING_THRESHOLD:
        long_score  += 1; signals.append("crowded shorts (neg funding)")
    elif funding > FUNDING_THRESHOLD:
        short_score += 1; signals.append("crowded longs (pos funding)")

    # Sentiment engagement
    if sent > 0.3:
        long_score += 1; signals.append(f"high engagement ({sent:.2f})")

    # Basis spread signal
    basis_signal = market.get("basis_signal", "normal")
    basis_alert  = market.get("basis_alert", False)
    if basis_alert:
        weight = 2 if basis_alert else 1
        if basis_signal == "discount":
            long_score  += weight; signals.append(f"Pacifica discount vs spot ({market.get('basis_pct', 0):+.2f}%)")
        elif basis_signal == "premium":
            short_score += weight; signals.append(f"Pacifica premium vs spot ({market.get('basis_pct', 0):+.2f}%)")

    threshold = 4
    if long_score >= threshold and long_score > short_score:
        action     = "LONG"
        confidence = min(0.5 + (long_score - threshold) * 0.08, 0.82)
        size_pct   = 0.25 if long_score < 5 else (0.5 if long_score < 7 else 0.75)
    elif short_score >= threshold and short_score > long_score:
        action     = "SHORT"
        confidence = min(0.5 + (short_score - threshold) * 0.08, 0.82)
        size_pct   = 0.25 if short_score < 5 else (0.5 if short_score < 7 else 0.75)

    reasoning = f"[Fallback] {action}: " + (
        ", ".join(signals) if signals
        else (
            f"No clear signal — RSI 5m={rsi_5m_signal} 1h={rsi_1h_signal}, "
            f"funding={funding:.6f}"
        )
    )

    return {
        "action":     action,
        "confidence": round(confidence, 3),
        "reasoning":  reasoning,
        "size_pct":   size_pct,
        "symbol":     market["symbol"],
        "mark_price": market["mark_price"],
    }