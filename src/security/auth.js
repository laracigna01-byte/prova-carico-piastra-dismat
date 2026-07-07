const AUTH_KEY = "dismat_auth";

export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === "true";
}

export async function login(username, password) {
  const isLocalhost = window.location.hostname === "localhost";

  if (isLocalhost) {
    if (username === "demo" && password === "demo2026") {
      localStorage.setItem(AUTH_KEY, "true");
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

  localStorage.setItem(AUTH_KEY, "true");
  return true;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem("dismat_auth_time");
}