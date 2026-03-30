import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: { theme: "dark" },
        embeddedWallets: { createOnLogin: "users-without-wallets" },
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>
);