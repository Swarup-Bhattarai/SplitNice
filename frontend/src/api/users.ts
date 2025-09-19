// src/api/users.ts
import { getToken } from "./auth";

const API_URL = "http://localhost:8000/api";

export async function fetchUsers() {
  const token = getToken();
  const res = await fetch(`${API_URL}/users/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json(); // [{id, username, email}]
}
