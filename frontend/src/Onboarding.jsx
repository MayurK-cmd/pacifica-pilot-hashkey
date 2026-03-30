import { useState } from "react";
import { useApi } from "./useApi";

export default function OnboardingPage({ onDone }) {
  const api = useApi();
  const [solanaAddress, setSolanaAddress] = useState("");
  const [privateKey,    setPrivateKey]    = useState("");
  const [apiKey,        setApiKey]        = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  async function submit() {
    if (!solanaAddress.trim()) { setError("Solana wallet address is required"); return; }
    if (!privateKey.trim())    { setError("Agent private key is required"); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/keys", {
        pacificaAddress:    solanaAddress.trim(),   // main wallet pubkey
        pacificaPrivateKey: privateKey.trim(),       // agent private key
        pacificaApiKey:     apiKey.trim() || undefined,
      });
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Connect your Pacifica account</h2>
      <p>
        Your keys are AES-256 encrypted before storage and never leave our server in plain text.
      </p>

      <div>
        <label>Solana wallet address (main wallet) *</label>
        <input
          type="text"
          placeholder="Base58 public key — e.g. AMVvva41pZkvnQRbud1Kh3jqZmEsTngzifuGMPesEsrv"
          value={solanaAddress}
          onChange={e => setSolanaAddress(e.target.value)}
        />
        <small>
          This is your Phantom wallet address — the one you used to deposit on{" "}
          <a href="https://test-app.pacifica.fi" target="_blank" rel="noreferrer">
            test-app.pacifica.fi
          </a>
        </small>
      </div>

      <div>
        <label>Agent private key *</label>
        <input
          type="password"
          placeholder="Secret from test-app.pacifica.fi/apikey"
          value={privateKey}
          onChange={e => setPrivateKey(e.target.value)}
        />
        <small>
          Generate at{" "}
          <a href="https://test-app.pacifica.fi/apikey" target="_blank" rel="noreferrer">
            test-app.pacifica.fi/apikey
          </a>
          {" "}— this is the Secret, not the API Key
        </small>
      </div>

      <div>
        <label>Agent API key (public key from apikey page)</label>
        <input
          type="text"
          placeholder="API Key from test-app.pacifica.fi/apikey"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={submit} disabled={loading}>
        {loading ? "Saving..." : "Save and continue"}
      </button>
    </div>
  );
}