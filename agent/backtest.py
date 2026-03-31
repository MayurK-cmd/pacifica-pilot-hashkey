"""
backtest.py — 7-day paper-mode backtest using Binance historical klines.

Usage:
    python backtest.py                          # BTC-USDT, 7 days, $1000 start
    python backtest.py --symbol ETH --days 14
    python backtest.py --symbol SOL --capital 500 --stop-loss 4 --take-profit 8

How it works:
  1. Downloads 5m and 1h klines from Binance for the target symbol over the
     requested number of days.
  2. Iterates forward in time, computing RSI at each 5m bar.
  3. Calls strategy._fallback() with simulated market + flat sentiment so
     you can see exactly how the rule engine performs on real historical data.
  4. Simulates market orders with configurable slippage, stop-loss, and
     take-profit (trailing, matching the improved executor logic).
  5. Prints a full trade log and summary statistics (win rate, PnL, Sharpe).

Output:
  - Console trade-by-trade log
  - backtest_results.json  (machine-readable for frontend charts)
"""

import argparse, json, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
import requests

# ── Allow importing strategy without .env ─────────────────────────────────────
import os
os.environ.setdefault("GEMINI_API_KEY", "")   # prevent strategy import error

try:
    from market import compute_rsi, rsi_signal, _binance_candles
    import strategy as strat
except ImportError as e:
    print(f"[Backtest] Import error: {e}")
    print("  Make sure backtest.py is in the same directory as market.py and strategy.py.")
    sys.exit(1)


# ── Binance historical download ───────────────────────────────────────────────

def fetch_klines(symbol: str, interval: str, days: int) -> list[dict]:
    """Download up to `days` days of Binance klines for symbol (e.g. 'BTC')."""
    pair   = f"{symbol.upper()}USDT"
    limit  = min(1000, days * {"5m": 288, "1h": 24}.get(interval, 288))
    end_ts = int(datetime.now(timezone.utc).timestamp() * 1000)
    # Walk backwards in pages if needed
    all_k  = []
    while True:
        params = {"symbol": pair, "interval": interval, "endTime": end_ts, "limit": 1000}
        try:
            r = requests.get("https://api.binance.com/api/v3/klines", params=params, timeout=20)
            r.raise_for_status()
            page = r.json()
        except Exception as e:
            print(f"[Backtest] Binance fetch failed ({interval}): {e}")
            break
        if not page:
            break
        all_k = page + all_k
        earliest = page[0][0]
        cutoff   = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp() * 1000)
        if earliest <= cutoff or len(all_k) >= days * 288:
            break
        end_ts = earliest - 1

    # Trim to requested window
    cutoff = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp() * 1000)
    all_k  = [k for k in all_k if k[0] >= cutoff]

    return [
        {
            "t": k[0], "o": float(k[1]), "h": float(k[2]),
            "l": float(k[3]), "c": float(k[4]), "v": float(k[5]),
        }
        for k in all_k
        if isinstance(k, (list, tuple)) and len(k) >= 6
    ]


# ── Trailing stop helpers (mirror executor.py logic) ─────────────────────────

def _update_trailing(pos: dict, price: float):
    if pos["side"] == "bid":
        if price > pos.get("trailing_high", pos["entry"]):
            pos["trailing_high"] = price
    else:
        if price < pos.get("trailing_low", pos["entry"]):
            pos["trailing_low"] = price


def _check_exit(pos: dict, price: float, sl_pct: float, tp_pct: float) -> tuple[bool, str]:
    _update_trailing(pos, price)
    entry = pos["entry"]

    if pos["side"] == "bid":
        floor     = pos.get("trailing_high", entry) * (1 - sl_pct / 100)
        entry_chg = (price - entry) / entry * 100
        if price <= floor:
            return True, f"trailing-stop (floor ${floor:,.2f})"
        if entry_chg >= tp_pct:
            return True, f"take-profit +{entry_chg:.2f}%"
    else:
        ceil      = pos.get("trailing_low", entry) * (1 + sl_pct / 100)
        entry_chg = (entry - price) / entry * 100
        if price >= ceil:
            return True, f"trailing-stop (ceil ${ceil:,.2f})"
        if entry_chg >= tp_pct:
            return True, f"take-profit +{entry_chg:.2f}%"

    return False, ""


# ── Main backtest loop ────────────────────────────────────────────────────────

def run_backtest(
    symbol:       str   = "BTC",
    days:         int   = 7,
    capital:      float = 1000.0,
    max_pos_pct:  float = 0.5,     # max position = capital * this
    stop_loss:    float = 3.0,
    take_profit:  float = 6.0,
    min_conf:     float = 0.55,
    slippage_pct: float = 0.05,    # 0.05% per side
) -> dict:

    print(f"\n{'='*60}")
    print(f"  PacificaPilot Backtest — {symbol}USDT — {days}d")
    print(f"  Capital: ${capital:.2f}  |  SL: {stop_loss}%  TP: {take_profit}%")
    print(f"{'='*60}\n")

    print(f"[Backtest] Downloading {days}d of 5m klines…")
    k5m = fetch_klines(symbol, "5m", days)
    print(f"[Backtest] Downloading {days}d of 1h klines…")
    k1h = fetch_klines(symbol, "1h", days)

    if len(k5m) < 30:
        print(f"[Backtest] Not enough 5m candles ({len(k5m)}) — aborting.")
        return {}
    if len(k1h) < 14:
        print(f"[Backtest] Not enough 1h candles ({len(k1h)}) — aborting.")
        return {}

    print(f"[Backtest] Got {len(k5m)} × 5m and {len(k1h)} × 1h candles.\n")

    # Build a timestamp → 1h index map for fast lookup
    h1_map: dict[int, int] = {}
    for idx, bar in enumerate(k1h):
        h1_map[bar["t"]] = idx

    balance   = capital
    position  = None           # dict with entry, side, size, trailing_high/low
    trades    = []
    equity_curve = []

    max_pos = capital * max_pos_pct
    RSI_WINDOW = 30            # candles of 5m history before first decision

    for i in range(RSI_WINDOW, len(k5m)):
        bar   = k5m[i]
        ts    = bar["t"]
        close = bar["c"]

        # ── Exit check ────────────────────────────────────────────────────────
        if position:
            exited, reason = _check_exit(position, close, stop_loss, take_profit)
            if exited:
                fill   = close * (1 + slippage_pct / 100) if position["side"] == "ask" else close * (1 - slippage_pct / 100)
                if position["side"] == "bid":
                    pnl = (fill - position["entry"]) / position["entry"] * position["size"]
                else:
                    pnl = (position["entry"] - fill) / position["entry"] * position["size"]
                balance += position["size"] + pnl
                trade = {
                    "entry_ts":    position["entry_ts"],
                    "exit_ts":     ts,
                    "side":        position["side"],
                    "entry_price": position["entry"],
                    "exit_price":  fill,
                    "size":        position["size"],
                    "pnl":         round(pnl, 4),
                    "reason":      reason,
                    "entry_dt":    datetime.fromtimestamp(position["entry_ts"] / 1000, tz=timezone.utc).isoformat(),
                    "exit_dt":     datetime.fromtimestamp(ts / 1000, tz=timezone.utc).isoformat(),
                }
                trades.append(trade)
                win  = "✓" if pnl > 0 else "✗"
                print(
                    f"  {win} EXIT  {position['side'].upper():5s}  "
                    f"entry ${position['entry']:,.2f} → exit ${fill:,.2f}  "
                    f"PnL ${pnl:+.2f}  [{reason}]"
                )
                position = None

        equity_curve.append({"ts": ts, "equity": round(balance, 2)})
        if position:
            continue    # don't open new position while one is open

        # ── RSI computation ───────────────────────────────────────────────────
        closes_5m = [c["c"] for c in k5m[max(0, i - 60):i + 1]]
        rsi_5m    = compute_rsi(closes_5m)

        # Find the closest 1h bar at or before this timestamp
        hour_ts  = (ts // 3_600_000) * 3_600_000
        h1_idx   = h1_map.get(hour_ts)
        rsi_1h   = None
        if h1_idx is not None and h1_idx >= 14:
            closes_1h = [c["c"] for c in k1h[h1_idx - 28:h1_idx + 1]]
            rsi_1h    = compute_rsi(closes_1h)

        # ── Mock market / sentiment for strategy ─────────────────────────────
        market = {
            "symbol":        symbol,
            "mark_price":    close,
            "index_price":   close,
            "change_24h":    0.0,
            "volume_24h":    0.0,
            "rsi_14":        rsi_5m,
            "rsi_1h":        rsi_1h,
            "rsi_5m_signal": rsi_signal(rsi_5m),
            "rsi_1h_signal": rsi_signal(rsi_1h),
            "funding_rate":  0.0,
            "basis_signal":  "normal",
            "basis_alert":   False,
            "basis_pct":     None,
            "open_position": "None",
            "unrealized_pnl":"N/A",
        }
        sentiment = {
            "sentiment_score": 0.0,
            "mention_count":   0,
            "trending_score":  0.0,
            "summary":         "backtest — no sentiment data",
        }
        account_context = {
            "availableToSpend": balance,
            "usdcBalance":      balance,
            "accountEquity":    balance,
            "usedMargin":       0.0,
            "spotBalances":     [],
        }

        decision = strat._fallback(market, sentiment, account_context, max_pos)

        if decision["action"] in ("LONG", "SHORT") and decision["confidence"] >= min_conf:
            size = min(max_pos * decision["size_pct"], balance * 0.9)
            if size < 10:
                continue
            fill    = close * (1 + slippage_pct / 100) if decision["action"] == "LONG" else close * (1 - slippage_pct / 100)
            balance -= size
            side     = "bid" if decision["action"] == "LONG" else "ask"
            position = {
                "side":          side,
                "entry":         fill,
                "size":          size,
                "entry_ts":      ts,
                "trailing_high": fill if side == "bid" else None,
                "trailing_low":  fill if side == "ask" else None,
            }
            dt = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%m-%d %H:%M")
            print(
                f"  → OPEN  {decision['action']:5s}  ${fill:,.2f}  "
                f"size ${size:.2f}  RSI 5m={rsi_5m or 'N/A'} 1h={rsi_1h or 'N/A'}  [{dt}]"
            )

    # Force-close any open position at last bar price
    if position:
        last_price = k5m[-1]["c"]
        if position["side"] == "bid":
            pnl = (last_price - position["entry"]) / position["entry"] * position["size"]
        else:
            pnl = (position["entry"] - last_price) / position["entry"] * position["size"]
        balance += position["size"] + pnl
        trades.append({
            "entry_ts":    position["entry_ts"],
            "exit_ts":     k5m[-1]["t"],
            "side":        position["side"],
            "entry_price": position["entry"],
            "exit_price":  last_price,
            "size":        position["size"],
            "pnl":         round(pnl, 4),
            "reason":      "end-of-backtest force-close",
        })
        print(f"  → Force-close at ${last_price:,.2f}  PnL ${pnl:+.2f}")

    # ── Summary stats ─────────────────────────────────────────────────────────
    total_pnl  = balance - capital
    wins       = [t for t in trades if t["pnl"] > 0]
    losses     = [t for t in trades if t["pnl"] <= 0]
    win_rate   = len(wins) / len(trades) * 100 if trades else 0.0
    avg_win    = sum(t["pnl"] for t in wins)   / len(wins)   if wins   else 0.0
    avg_loss   = sum(t["pnl"] for t in losses) / len(losses) if losses else 0.0
    profit_factor = (
        abs(sum(t["pnl"] for t in wins)) / abs(sum(t["pnl"] for t in losses))
        if losses and sum(t["pnl"] for t in losses) != 0 else float("inf")
    )
    pnl_pct = total_pnl / capital * 100

    print(f"\n{'='*60}")
    print(f"  BACKTEST RESULTS — {symbol}USDT — {days}d")
    print(f"{'='*60}")
    print(f"  Start capital:   ${capital:,.2f}")
    print(f"  End balance:     ${balance:,.2f}  ({pnl_pct:+.2f}%)")
    print(f"  Total PnL:       ${total_pnl:+,.2f}")
    print(f"  Trades:          {len(trades)}")
    print(f"  Win rate:        {win_rate:.1f}%  ({len(wins)}W / {len(losses)}L)")
    print(f"  Avg win:         ${avg_win:+.2f}")
    print(f"  Avg loss:        ${avg_loss:+.2f}")
    print(f"  Profit factor:   {profit_factor:.2f}")
    print(f"{'='*60}\n")

    results = {
        "symbol":         symbol,
        "days":           days,
        "start_capital":  capital,
        "end_balance":    round(balance, 2),
        "total_pnl":      round(total_pnl, 4),
        "pnl_pct":        round(pnl_pct, 4),
        "total_trades":   len(trades),
        "wins":           len(wins),
        "losses":         len(losses),
        "win_rate_pct":   round(win_rate, 2),
        "avg_win":        round(avg_win, 4),
        "avg_loss":       round(avg_loss, 4),
        "profit_factor":  round(profit_factor, 4) if profit_factor != float("inf") else None,
        "stop_loss_pct":  stop_loss,
        "take_profit_pct":take_profit,
        "trades":         trades,
        "equity_curve":   equity_curve,
    }

    out_path = Path(__file__).parent / "backtest_results.json"
    out_path.write_text(json.dumps(results, indent=2))
    print(f"[Backtest] Full results saved to {out_path}")
    return results


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PacificaPilot 7-day backtest")
    parser.add_argument("--symbol",      default="BTC",  help="Token symbol, e.g. BTC ETH SOL")
    parser.add_argument("--days",        type=int,   default=7,    help="Lookback window in days")
    parser.add_argument("--capital",     type=float, default=1000, help="Starting capital in USDC")
    parser.add_argument("--stop-loss",   type=float, default=3.0,  help="Stop-loss %%")
    parser.add_argument("--take-profit", type=float, default=6.0,  help="Take-profit %%")
    parser.add_argument("--min-conf",    type=float, default=0.55, help="Min confidence to trade")
    args = parser.parse_args()

    run_backtest(
        symbol      = args.symbol,
        days        = args.days,
        capital     = args.capital,
        stop_loss   = args.stop_loss,
        take_profit = args.take_profit,
        min_conf    = args.min_conf,
    )