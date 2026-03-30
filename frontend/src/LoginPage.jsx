import { usePrivy } from "@privy-io/react-auth";

export default function LoginPage() {
  const { login } = usePrivy();

  return (
    <div>
      <h1>PacificaPilot</h1>
      <p>AI trading agent for Pacifica perps</p>
      <button onClick={login}>Login / Connect Wallet</button>
    </div>
  );
}