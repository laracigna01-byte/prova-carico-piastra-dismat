import { useState } from "react";
import { login } from "./auth";

export function LoginPage({ appName, moduleName, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      onSuccess();
    } catch (err) {
      setError(err.message || "Credenziali non valide");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dismat-login-page">
      <section className="dismat-login-card">
        <img
          src="/logo-dismat.jpeg"
          alt="DISMAT"
          className="dismat-login-logo"
        />

        <h1>{appName}</h1>

{moduleName && (
  <h2 className="dismat-module-title">
    {moduleName}
  </h2>
)}

<h3 className="dismat-login-subtitle">
  Area riservata ai tecnici autorizzati
</h3>

<p className="dismat-login-text">
  Inserire le credenziali fornite da DISMAT per accedere all'applicazione.
</p>

        <form onSubmit={handleSubmit} className="dismat-login-form">
          <label>
            Utente
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <label className="dismat-show-password">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Mostra password
          </label>

          {error && <div className="dismat-login-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>

        <footer>
          Versione 3.1<br />
          © DISMAT S.r.l.
        </footer>
      </section>
    </main>
  );
}