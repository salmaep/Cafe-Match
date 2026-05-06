import {
  Cafe,
  AuthResponse,
  User,
  BackendPurpose,
  OwnerDashboard,
} from "../types";
import { http as api } from "../lib/http";
import { mapBackendCafe, haversineKm } from "../queries/cafes/mappers";
import {
  fetchCafes,
  fetchCafeDetail,
  fetchPromotedCafes,
  toggleBookmarkApi,
  toggleFavoriteApi,
} from "../queries/cafes/api";

// Back-compat re-exports for screens that import the legacy names from services/api.
export { fetchCafes, fetchCafeDetail, fetchPromotedCafes, haversineKm };
export const toggleBookmark = toggleBookmarkApi;
export const toggleFavorite = toggleFavoriteApi;

// ─── Purposes ───

export async function fetchPurposes(): Promise<BackendPurpose[]> {
  const { data } = await api.get("/purposes");
  return data;
}

// ─── Destinations ───

export interface BackendDestination {
  id: number;
  label: string;
  sublabel: string | null;
  latitude: number;
  longitude: number;
  displayOrder: number;
}

export async function fetchDestinations(): Promise<BackendDestination[]> {
  const { data } = await api.get("/destinations");
  return data;
}

// ─── Auth ───

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post("/auth/login", { email, password });
  return {
    accessToken: data.accessToken,
    user: {
      id: String(data.user.id),
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      friendCode: data.user.friendCode,
      avatarUrl: data.user.avatarUrl,
    },
  };
}

export async function registerApi(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const { data } = await api.post("/auth/register", { name, email, password });
  return {
    id: String(data.id),
    name: data.name,
    email: data.email,
    role: data.role,
    friendCode: data.friendCode,
    avatarUrl: data.avatarUrl,
  };
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get("/auth/me");
  return {
    id: String(data.id),
    name: data.name,
    email: data.email,
    role: data.role,
    friendCode: data.friendCode,
    avatarUrl: data.avatarUrl,
  };
}

// ─── Bookmarks & Favorites ───

export async function fetchBookmarks(): Promise<Cafe[]> {
  const { data } = await api.get("/bookmarks");
  return data.map((b: any) => mapBackendCafe(b.cafe));
}

export type FavoriteEntry = Cafe & { favoritedAt: string };

/**
 * Fetch favorites. Pass `since` (e.g. "7d", "24h") to limit to recent ones —
 * server filters by `created_at`. Without `since` returns all-time favorites.
 */
export async function fetchFavorites(since?: string): Promise<FavoriteEntry[]> {
  const { data } = await api.get("/favorites", {
    params: since ? { since } : undefined,
  });
  return data.map((f: any) => ({
    ...mapBackendCafe(f.cafe),
    favoritedAt: f.createdAt,
  }));
}

// ─── Owner ───

export async function fetchOwnerDashboard(): Promise<OwnerDashboard> {
  const { data } = await api.get("/owner/dashboard");
  return data;
}

export async function fetchOwnerCafe(): Promise<any> {
  const { data } = await api.get("/owner/cafe");
  return data;
}

export async function fetchOwnerPromotions(): Promise<any[]> {
  const { data } = await api.get("/promotions/mine");
  return data;
}

// ─── Analytics ───

export async function trackAnalytics(
  cafeId: string,
  eventType: "view" | "click",
  promotionId?: number,
) {
  try {
    await api.post("/analytics/track", {
      cafeId: Number(cafeId),
      eventType,
      promotionId,
    });
  } catch {
    // Silent fail for analytics
  }
}

// ─── Reviews ───

export async function fetchReviews(cafeId: string, page = 1) {
  const { data } = await api.get(`/reviews/cafe/${cafeId}`, {
    params: { page },
  });
  const reviews = (data.data || data).map((r: any) => ({
    id: String(r.id),
    userId: r.userId,
    userName: r.user?.name || "Anonim",
    userAvatar: r.user?.avatarUrl,
    cafeId: String(r.cafeId),
    text: r.text,
    ratings: (r.ratings || []).map((rt: any) => ({
      category: rt.category,
      score: rt.score,
    })),
    media: (r.media || []).map((m: any) => ({
      id: m.id,
      mediaType: m.mediaType,
      url: m.url,
      displayOrder: m.displayOrder || 0,
    })),
    createdAt: r.createdAt,
  }));
  return { reviews, meta: data.meta };
}

export async function fetchReviewSummary(cafeId: string) {
  const { data } = await api.get(`/reviews/cafe/${cafeId}/summary`);
  return data as { category: string; avgScore: number; count: number }[];
}

export async function createReview(
  cafeId: string,
  dto: {
    text?: string;
    ratings: { category: string; score: number }[];
    media?: { mediaType: "photo" | "video"; url: string }[];
  },
) {
  const { data } = await api.post(`/reviews/${cafeId}`, dto);
  return data;
}

export async function updateReview(
  reviewId: string,
  dto: { text?: string; ratings: { category: string; score: number }[] },
) {
  const { data } = await api.put(`/reviews/${reviewId}`, dto);
  return data;
}

export async function deleteReview(reviewId: string) {
  await api.delete(`/reviews/${reviewId}`);
}

// ─── Check-ins ───

export async function checkInApi(cafeId: number, lat: number, lng: number) {
  const { data } = await api.post("/checkins/in", {
    cafeId,
    latitude: lat,
    longitude: lng,
  });
  return data;
}

export async function checkOutApi(checkinId?: number, cafeId?: number) {
  const { data } = await api.post("/checkins/out", { checkinId, cafeId });
  return data;
}

export async function fetchActiveCheckin() {
  try {
    const { data } = await api.get("/checkins/active");
    return data;
  } catch {
    return null;
  }
}

export async function fetchCheckinHistory(page = 1) {
  const { data } = await api.get("/checkins/history", { params: { page } });
  return data;
}

export async function fetchLeaderboard(cafeId: string) {
  const { data } = await api.get(`/checkins/cafe/${cafeId}/leaderboard`);
  return data as {
    rank: number;
    userId: number;
    name: string;
    avatarUrl?: string;
    checkinCount: number;
    badge: string | null;
  }[];
}

export async function fetchStreak() {
  const { data } = await api.get("/checkins/streak");
  return data as { current: number; longest: number; active: boolean };
}

export async function fetchGlobalLeaderboard() {
  const { data } = await api.get("/checkins/global-leaderboard");
  return data;
}

// ─── Friends ───

export async function sendFriendRequest(friendCode: string) {
  const { data } = await api.post("/friends/request", { friendCode });
  return data;
}

export async function acceptFriendRequest(requestId: number) {
  const { data } = await api.put(`/friends/request/${requestId}/accept`);
  return data;
}

export async function rejectFriendRequest(requestId: number) {
  const { data } = await api.put(`/friends/request/${requestId}/reject`);
  return data;
}

export async function fetchPendingRequests() {
  const { data } = await api.get("/friends/requests/pending");
  return data;
}

export async function fetchFriendsList() {
  const { data } = await api.get("/friends");
  return data;
}

export async function fetchFriendsMap() {
  const { data } = await api.get("/friends/map");
  return data;
}

export async function throwEmojiApi(friendId: number, emoji: string) {
  const { data } = await api.post(`/friends/${friendId}/emoji`, { emoji });
  return data;
}

// ─── Achievements ───

export async function fetchMyAchievements() {
  const { data } = await api.get("/achievements/me");
  return data;
}

export async function fetchAllAchievements() {
  const { data } = await api.get("/achievements");
  return data;
}

// ─── Notifications ───

export async function fetchNotifications(page = 1) {
  const { data } = await api.get("/notifications", { params: { page } });
  return data;
}

export async function fetchUnreadCount() {
  const { data } = await api.get("/notifications/unread-count");
  return typeof data === "number" ? data : data.count || 0;
}

export async function markNotificationRead(id: number) {
  await api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.put("/notifications/read-all");
}

export async function registerPushToken(token: string, platform: string) {
  await api.post("/notifications/register-token", { token, platform });
}

// ─── Recap ───

export async function fetchRecap(year: number) {
  try {
    const { data } = await api.get(`/recaps/${year}`);
    return data;
  } catch {
    return null;
  }
}

export async function generateRecap(year: number) {
  const { data } = await api.post("/recaps/generate", { year });
  return data;
}

export default api;
