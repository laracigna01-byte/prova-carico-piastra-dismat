export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Metodo non consentito" });
  }

  const { username, password } = req.body || {};

  const validUser = process.env.LOGIN_USER || "demo";
  const validPassword = process.env.LOGIN_PASSWORD || "demo2026";

  if (username === validUser && password === validPassword) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({
    ok: false,
    message: "Credenziali non valide",
  });
}