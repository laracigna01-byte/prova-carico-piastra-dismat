import { useState } from "react";
import { isAuthenticated, logout } from "./auth";
import { LoginPage } from "./LoginPage";
import { AuthContext } from "./AuthContext";
import "./loginGate.css";

export function LoginGate({
  children,
  appName = "Sistema Gestione Prove DISMAT",
  moduleName = "",
}) {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  function handleLogout() {
    logout();
    setAuthenticated(false);
  }

  if (!authenticated) {
    return (
      <LoginPage
        appName={appName}
        moduleName={moduleName}
        onSuccess={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <AuthContext.Provider value={{ logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}