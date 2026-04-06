from hashkey_logger import log_to_chain

tx = log_to_chain(
    symbol     = "BTC",
    action     = "HOLD",
    mark_price = 66000.0,
    pnl_usdc   = None,
    confidence = 0.7,
    rsi_5m     = 61.07,
    rsi_1h     = 51.70,
    reasoning  = "Test decision — verifying on-chain logging works.",
    dry_run    = True,
)
print("TX hash:", tx)