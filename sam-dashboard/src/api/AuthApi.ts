const API_BASE = "https://698d6f2cb79d1c928ed54b6b.mockapi.io/api";

export interface User {
  id: string;
  username: string;
  password: string;
  name?: string;
  email?: string;
}

async function getUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE}/users`);
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

export async function login(username: string, password: string): Promise<boolean> {
  try {
    const users = await getUsers();
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      // Store auth state in localStorage
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("currentUser", JSON.stringify(user));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export function logout(): void {
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("currentUser");
}

export function isAuthenticated(): boolean {
  return localStorage.getItem("isAuthenticated") === "true";
}

export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem("currentUser");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
