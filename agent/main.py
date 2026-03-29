"""
main.py — PacificaPilot agent loop.
All output goes through logger.push_log() so the frontend SSE stream sees everything.
"""

import os, time, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

import market as mkt
import sentiment as snt
import strategy as strat
import executor as exe
import logger as log

BACKEND_URL      = os.getenv("BACKEND_URL", "http://localhost:3001")
DEFAULT_SYMBOLS  = [s.strip() for s in os.getenv("TRADE_SYMBOLS", "BTC,ETH").split(",")]
DEFAULT_INTERVAL = int(os.getenv("LOOP_INTERVAL_SECONDS", "300"))
DEFAULT_MAX_POS  = float(os.getenv("MAX_POSITION_USDC", "50"))
DEFAULT_MIN_CONF = float(os.getenv("MIN_CONFIDENCE", "0.6"))
DRY_RUN          = os.getenv("DRY_RUN", "true").lower() == "true"


def fetch_config() -> dict:
    try:
        r = requests.get(f"{BACKEND_URL}/api/config", timeout=5)
        r.raise_for_status()
        c = r.json()
        return {
            "symbols":    c.get("symbols", DEFAULT_SYMBOLS),
            "interval":   c.get("loopIntervalSeconds", DEFAULT_INTERVAL),
            "max_pos":    c.get("maxPositionUsdc", DEFAULT_MAX_POS),
            "min_conf":   c.get("minConfidence", DEFAULT_MIN_CONF),
            "enabled":    c.get("enabled", True),
            "risk_level": c.get("riskLevel", "balanced"),
        }
    except Exception as e:
        log.push_log(f"[Config] Backend unreachable: {e} — using env defaults")
        return {
            "symbols": DEFAULT_SYMBOLS, "interval": DEFAULT_INTERVAL,
            "max_pos": DEFAULT_MAX_POS, "min_conf": DEFAULT_MIN_CONF,
            "enabled": True, "risk_level": "balanced",
        }


def run_cycle(cfg: dict, cycle_count: int):
    symbols  = cfg["symbols"]
    max_pos  = cfg["max_pos"]
    min_conf = cfg["min_conf"]

    log.push_log(f"{'='*56}")
    log.push_log(f"[PacificaPilot] Cycle #{cycle_count} — {symbols}")
    log.push_log(f"  Mode: {'DRY RUN' if DRY_RUN else 'LIVE'}  |  Max: ${max_pos}  |  MinConf: {min_conf:.0%}")
    log.push_log(f"{'='*56}")

    live_positions = exe.get_open_positions()
    if live_positions:
        log.push_log(f"  Open positions: {list(live_positions.keys())}")

    for symbol in symbols:
        try:
            # 1. Market
            log.push_log(f"[{symbol}] Fetching market data...")
            market = mkt.get_market_snapshot(symbol)
            rsi_s  = f"{market['rsi_14']:.2f}" if market.get("rsi_14") else "N/A"
            rsi_1h = f"{market['rsi_1h']:.2f}" if market.get("rsi_1h") else "N/A"
            log.push_log(f"  Price: ${market['mark_price']:,.2f}  RSI 5m: {rsi_s}  RSI 1h: {rsi_1h}  Funding: {market['funding_rate']:.6f}")

            current_price = market["mark_price"]

            # 2. Stop-loss / take-profit check
            exit_triggered, exit_reason = exe.should_exit(symbol, current_price)
            if exit_triggered:
                log.push_log(f"[{symbol}] EXIT triggered: {exit_reason}")
                pnl          = exe.compute_pnl(symbol, current_price)
                close_result = exe.close_position(symbol, reason=exit_reason)
                log.log_decision(
                    decision={"action":"EXIT","confidence":1.0,"reasoning":f"Auto-exit: {exit_reason}","size_pct":0,"symbol":symbol,"mark_price":current_price},
                    market=market,
                    sentiment={"sentiment_score":0,"mention_count":0,"trending_score":0,"summary":""},
                    order_result=close_result, pnl_usdc=pnl,
                )
                log.send_heartbeat(symbol=symbol)
                continue

            pos = live_positions.get(symbol)
            market["open_position"]  = f"{pos['side']} ${pos['size']:.2f} @ ${pos['entry_price']:,.2f}" if pos else "None"
            market["unrealized_pnl"] = f"${pos.get('unrealized_pnl',0):.2f}" if pos else "N/A"

            # 3. Sentiment
            log.push_log(f"[{symbol}] Fetching Elfa AI sentiment...")
            sentiment = snt.get_token_sentiment(symbol)
            log.push_log(f"  Engagement: {sentiment['sentiment_score']:.2f}  Mentions: {sentiment['mention_count']}  Trending: {sentiment['trending_score']:.0f}")

            # 4. Decision
            log.push_log(f"[{symbol}] Asking Gemini...")
            decision = strat.decide(market, sentiment)
            log.push_log(f"  Decision: {decision['action']} (conf {decision['confidence']:.0%})  Reason: {decision['reasoning'][:80]}...")

            # 5. Execute
            order_result = None
            pnl_usdc     = exe.compute_pnl(symbol, current_price)

            if decision["action"] in ("LONG", "SHORT"):
                if decision["confidence"] < min_conf:
                    log.push_log(f"[{symbol}] Confidence {decision['confidence']:.0%} below min {min_conf:.0%} — skipping")
                    decision["action"] = "HOLD"
                elif pos and pos["side"] == ("bid" if decision["action"]=="LONG" else "ask"):
                    log.push_log(f"[{symbol}] Already in same-direction position — skipping")
                    decision["action"] = "HOLD"
                else:
                    side      = "bid" if decision["action"] == "LONG" else "ask"
                    usdc_size = max_pos * decision.get("size_pct", 0.5)
                    log.push_log(f"[{symbol}] Placing {decision['action']} ${usdc_size:.2f}...")
                    order_result = exe.place_market_order(symbol, side, usdc_size)
                    if order_result and not order_result.get("skipped"):
                        exe.record_entry(symbol, side, current_price, usdc_size)
            else:
                log.push_log(f"[{symbol}] HOLD — no order placed")

            # 6. Log decision
            log.log_decision(decision, market, sentiment, order_result, pnl_usdc=pnl_usdc)
            log.send_heartbeat(symbol=symbol)

        except Exception as e:
            import traceback
            log.push_log(f"[{symbol}] Cycle error: {e}")
            log.push_log(traceback.format_exc())
            log.send_heartbeat(symbol=symbol, error=str(e))


def main():
    log.push_log(f"[PacificaPilot] Starting — Backend: {BACKEND_URL}  DRY_RUN: {DRY_RUN}")
    cycle = 0
    while True:
        cfg = fetch_config()
        if not cfg["enabled"] and cycle > 0:
            log.push_log("[PacificaPilot] Disabled via config — sleeping 30s...")
            time.sleep(30)
            continue
        run_cycle(cfg, cycle)
        cycle += 1
        log.push_log(f"Sleeping {cfg['interval']}s until next cycle...")
        time.sleep(cfg["interval"])


if __name__ == "__main__":
    main()