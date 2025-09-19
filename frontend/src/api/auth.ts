// src/api/auth.ts
const API_URL = "http://localhost:8000/api";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json(); // { access, refresh }
}

export function saveToken(token: string) {
  localStorage.setItem("access", token);
}
export function getToken() {
  return localStorage.getItem("access");
}
export function clearToken() {
  localStorage.removeItem("access");
}

export async function fetchMe() {
  const token = getToken();
  const res = await fetch(`${API_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load current user");
  return res.json(); // { id, username, email }
}
