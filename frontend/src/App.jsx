import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useApi } from "./useApi";
import LoginPage from "./LoginPage";
import OnboardingPage from "./Onboarding";
import Dashboard from "./Dashboard";

export default function App() {
  const { ready, authenticated, user, logout } = usePrivy();
  const api = useApi();
  const [onboarded, setOnboarded] = useState(null); // null = loading

  // Once authenticated, sync user to our backend and check onboarding status
  useEffect(() => {
    if (!authenticated || !user) return;

    const email         = user.email?.address || null;
    const walletAddress = user.wallet?.address || null;

    api.post("/api/auth/sync", { email, walletAddress })
      .then(data => setOnboarded(data.onboarded))
      .catch(() => setOnboarded(false));
  }, [authenticated, user]);

  // Not ready yet
  if (!ready) return <p>Loading...</p>;

  // Not logged in
  if (!authenticated) return <LoginPage />;

  // Logged in but waiting for sync response
  if (onboarded === null) return <p>Setting up your account...</p>;

  // Logged in but hasn't saved Pacifica key yet
  if (!onboarded) return <OnboardingPage onDone={() => setOnboarded(true)} />;

  // Fully set up
  return <Dashboard user={user} onLogout={logout} />;
}