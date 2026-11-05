// The session token proves which seat is ours. sessionStorage keeps it per tab,
// so two tabs are two players. Storage can be blocked: never let that throw
const KEY = "dutch.token";

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // Without storage a reload loses the seat, the game still works
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored, nothing to clear
  }
}
