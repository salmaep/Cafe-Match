/**
 * Per-friend visibility — stored client-side only (localStorage).
 *
 * Why localStorage instead of a server flag: backend currently has no support
 * for per-friend hiding (no column on `users`, no `hidden_friends` join table).
 * This is a stop-gap until backend privacy lands; data does not sync between
 * devices and disappears if the user clears storage. That's acceptable for
 * now since the only consumer is the user's own profile view.
 */

const KEY = 'cm_hidden_friends';

function read(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is number => typeof x === 'number'));
  } catch {
    return new Set();
  }
}

function write(set: Set<number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Quota exceeded or storage disabled — silent fail.
  }
}

export function getHiddenFriends(): Set<number> {
  return read();
}

export function isFriendHidden(friendId: number): boolean {
  return read().has(friendId);
}

export function hideFriend(friendId: number): void {
  const set = read();
  set.add(friendId);
  write(set);
}

export function unhideFriend(friendId: number): void {
  const set = read();
  set.delete(friendId);
  write(set);
}
