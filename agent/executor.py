"""
executor.py — Places/closes market orders on Pacifica with full position management.

Key design:
  - walletAddress comes from backend config, NOT derived from private key
  - stop_loss_pct and take_profit_pct come from config per cycle, NOT env vars
  - PACIFICA_PRIVATE_KEY     = main wallet private key (signs account identity)
  - PACIFICA_AGENT_PRIVATE_KEY = agent wallet private key (signs POST requests)
  - PACIFICA_AGENT_PUBLIC_KEY  = agent wallet public key (sent as agent_wallet field)
"""

import os, json, time, uuid, base58, requests
from pathlib import Path
from dotenv import load_dotenv
from solders.keypair import Keypair

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

BASE_URL           = os.getenv("PACIFICA_BASE_URL", "https://test-api.pacifica.fi/api/v1")
PRIVATE_KEY        = os.getenv("PACIFICA_PRIVATE_KEY", "")
AGENT_PRIVATE_KEY  = os.getenv("PACIFICA_AGENT_PRIVATE_KEY", "")
AGENT_PUBLIC_KEY   = os.getenv("PACIFICA_AGENT_PUBLIC_KEY", "")
ORDER_SLIPPAGE_PCT = os.getenv("ORDER_SLIPPAGE_PERCENT", "0.5")
DRY_RUN            = os.getenv("DRY_RUN", "true").lower() == "true"

_open_positions: dict = {}
_keypair              = None
_agent_keypair        = None


def _get_keypair() -> Keypair:
    """Main wallet keypair — for signing identity on POST requests."""
    global _keypair
    if _keypair is None:
        raw = PRIVATE_KEY.strip()
        if not raw:
            raise RuntimeError("PACIFICA_PRIVATE_KEY is not set in agent .env")
        try:
            _keypair = Keypair.from_base58_string(raw)
        except Exception:
            _keypair = Keypair.from_bytes(base58.b58decode(raw))
    return _keypair


def _get_agent_keypair() -> Keypair:
    """Agent wallet keypair — signs all POST request payloads."""
    global _agent_keypair
    if _agent_keypair is None:
        raw = AGENT_PRIVATE_KEY.strip()
        if not raw:
            raise RuntimeError("PACIFICA_AGENT_PRIVATE_KEY is not set in agent .env")
        try:
            _agent_keypair = Keypair.from_base58_string(raw)
        except Exception:
            _agent_keypair = Keypair.from_bytes(base58.b58decode(raw))
    return _agent_keypair


def _sort_json_keys(v):
    if isinstance(v, dict):
        return {k: _sort_json_keys(vv) for k, vv in sorted(v.items())}
    if isinstance(v, list):
        return [_sort_json_keys(i) for i in v]
    return v


def _sign_payload(op: str, data: dict) -> dict:
    """
    Builds the signed auth payload for POST requests.
    account    = main wallet pubkey (who owns the account)
    agent_wallet = agent pubkey (who signed this request)
    signature  = Ed25519 signature from agent private key
    """
    main_kp = _get_keypair()

    if AGENT_PRIVATE_KEY and AGENT_PUBLIC_KEY:
        signing_kp   = _get_agent_keypair()
        agent_wallet = AGENT_PUBLIC_KEY.strip()
    else:
        # Fallback: sign with main wallet directly
        signing_kp   = main_kp
        agent_wallet = None

    ts  = int(time.time() * 1_000)
    ew  = 5_000
    msg = json.dumps(
        _sort_json_keys({
            "timestamp":     ts,
            "expiry_window": ew,
            "type":          op,
            "data":          data,
        }),
        separators=(",", ":"),
    ).encode()

    sig = base58.b58encode(bytes(signing_kp.sign_message(msg))).decode()

    return {
        "account":       str(main_kp.pubkey()),
        "agent_wallet":  agent_wallet,
        "signature":     sig,
        "timestamp":     ts,
        "expiry_window": ew,
    }


def _headers() -> dict:
    return {"Content-Type": "application/json"}


def _post(path: str, op: str, data: dict, retries: int = 3) -> dict:
    body = {**_sign_payload(op, data), **data}
    for attempt in range(retries):
        try:
            r = requests.post(
                f"{BASE_URL}{path}", json=body, headers=_headers(), timeout=15
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            wait = 2 ** attempt
            print(f"[Executor] POST {path} attempt {attempt+1}/{retries} failed: {e}. Waiting {wait}s...")
            time.sleep(wait)
    raise RuntimeError(f"[Executor] {path} failed after {retries} retries")


def _get_api(path: str, wallet_address: str, params: dict = None, retries: int = 3) -> dict:
    """
    GET request to Pacifica API.
    wallet_address comes from backend config — NOT derived from private key.
    """
    merged = {"account": wallet_address, **(params or {})}
    for attempt in range(retries):
        try:
            r = requests.get(
                f"{BASE_URL}{path}", params=merged, headers=_headers(), timeout=10
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            wait = 2 ** attempt
            print(f"[Executor] GET {path} attempt {attempt+1}/{retries} failed: {e}. Waiting {wait}s...")
            time.sleep(wait)
    return {}


def get_account_info(wallet_address: str) -> dict:
    raw  = _get_api("/account", wallet_address)
    # Pacifica wraps: { success, data: { balance, positions, ... } }
    return raw.get("data", raw)


def get_open_positions(wallet_address: str) -> dict:
    """
    Fetches live open positions from Pacifica for the given wallet.
    wallet_address is the main Solana pubkey that deposited on Pacifica.
    """
    global _open_positions
    try:
        info      = get_account_info(wallet_address)
        positions = info.get("positions", []) or []
        live      = {}
        for p in positions:
            sym  = p.get("symbol", "")
            size = float(p.get("size", 0) or 0)
            if size != 0:
                live[sym] = {
                    "side":           "bid" if size > 0 else "ask",
                    "size":           abs(size),
                    "entry_price":    float(p.get("entry_price",    0) or 0),
                    "unrealized_pnl": float(p.get("unrealized_pnl", 0) or 0),
                    "mark_price":     float(p.get("mark_price",     0) or 0),
                }
        _open_positions = live
        return live
    except Exception as e:
        print(f"[Executor] Could not fetch live positions: {e}")
        return _open_positions


def compute_pnl(symbol: str, current_price: float) -> float | None:
    pos = _open_positions.get(symbol)
    if not pos or pos["entry_price"] == 0:
        return None
    entry = pos["entry_price"]
    size  = pos["size"]
    if pos["side"] == "bid":
        return round((current_price - entry) / entry * size, 4)
    return round((entry - current_price) / entry * size, 4)


def should_exit(
    symbol: str,
    current_price: float,
    stop_loss_pct: float,
    take_profit_pct: float,
) -> tuple[bool, str]:
    """
    Checks stop-loss and take-profit using values from backend config,
    not hardcoded env vars.
    """
    pos = _open_positions.get(symbol)
    if not pos or pos["entry_price"] == 0:
        return False, ""

    entry  = pos["entry_price"]
    change = (current_price - entry) / entry * 100

    if pos["side"] == "bid":
        if change <= -stop_loss_pct:
            return True, f"stop-loss {change:.2f}%"
        if change >= take_profit_pct:
            return True, f"take-profit {change:.2f}%"
    else:
        inv = -change
        if inv <= -stop_loss_pct:
            return True, f"stop-loss {inv:.2f}%"
        if inv >= take_profit_pct:
            return True, f"take-profit {inv:.2f}%"

    return False, ""


def place_market_order(symbol: str, side: str, usdc_size: float, max_position_usdc: float) -> dict:
    """
    Places a market order. max_position_usdc comes from config, not env.
    """
    positions = get_open_positions.__wrapped__ if hasattr(get_open_positions, '__wrapped__') else None
    if symbol in _open_positions:
        pos = _open_positions[symbol]
        print(f"[Executor] Skipping {symbol}: already have {pos['side']} position (size={pos['size']:.2f})")
        return {"skipped": True, "reason": "existing_position", "symbol": symbol}

    capped = min(usdc_size, max_position_usdc)
    cid    = str(uuid.uuid4())
    order  = {
        "symbol":           symbol,
        "side":             side,
        "amount":           str(round(capped, 4)),
        "slippage_percent": str(ORDER_SLIPPAGE_PCT),
        "reduce_only":      False,
        "client_order_id":  cid,
    }

    if DRY_RUN:
        print(f"[DRY RUN] Would place {side.upper()} {symbol} ${capped:.2f}")
        return {
            "dry_run": True, "client_order_id": cid,
            "symbol": symbol, "side": side,
            "amount": capped, "status": "simulated",
        }

    return _post("/orders/create_market", "create_market_order", order)


def close_position(symbol: str, reason: str = "") -> dict:
    pos = _open_positions.get(symbol)
    if not pos:
        return {"skipped": True, "reason": "no_position"}

    close_side = "ask" if pos["side"] == "bid" else "bid"
    order = {
        "symbol":           symbol,
        "side":             close_side,
        "amount":           str(round(pos["size"], 4)),
        "slippage_percent": str(ORDER_SLIPPAGE_PCT),
        "reduce_only":      True,
        "client_order_id":  str(uuid.uuid4()),
    }

    if reason:
        print(f"[Executor] Closing {symbol}: {reason}")

    if DRY_RUN:
        print(f"[DRY RUN] Would close {symbol} {close_side}")
        _open_positions.pop(symbol, None)
        return {"dry_run": True, "status": "simulated_close", "symbol": symbol, "reason": reason}

    result = _post("/orders/create_market", "create_market_order", order)
    _open_positions.pop(symbol, None)
    return result


def record_entry(symbol: str, side: str, entry_price: float, size: float):
    _open_positions[symbol] = {
        "side":        side,
        "entry_price": entry_price,
        "size":        size,
        "entry_time":  time.time(),
    }