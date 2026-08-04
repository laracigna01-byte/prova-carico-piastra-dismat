const AUTH_KEY = "dismat_auth";

export function isAuthenticated() {
  try {
    return localStorage.getItem(AUTH_KEY) === "true" || sessionStorage.getItem(AUTH_KEY) === "true";
  } catch {
    return sessionStorage.getItem(AUTH_KEY) === "true";
  }
}

function persistAuthentication() {
  // Su iOS localStorage può essere già pieno a causa di vecchie foto in base64.
  // Il fallback di sessione permette l'accesso senza cancellare la prova: una
  // volta aperta, l'app migrerà foto e firma nella memoria IndexedDB.
  try {
    localStorage.setItem(AUTH_KEY, "true");
  } catch (error) {
    console.warn("Memoria locale piena: accesso salvato per la sessione", error);
    sessionStorage.setItem(AUTH_KEY, "true");
  }
}

export async function login(username, password) {
  const isLocalhost = window.location.hostname === "localhost";

  if (isLocalhost) {
    if (username === "demo" && password === "demo2026") {
      persistAuthentication();
      return true;
    }

    throw new Error("Credenziali non valide");
  }

  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || "Credenziali non valide");
  }

  persistAuthentication();
  return true;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem("dismat_auth_time");
}
