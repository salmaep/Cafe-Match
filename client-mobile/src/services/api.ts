import axios, { AxiosInstance } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Cafe,
  AuthResponse,
  User,
  BackendPurpose,
  OwnerDashboard,
} from "../types";
import { MOCK_CAFES } from "../data/mockCafes";

// Change this to your local network IP when running the backend
const BASE_URL = "http://192.168.1.36:3000/api/v1";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s — accommodates slow WiFi + large responses (553 cafes)
  headers: { "Content-Type": "application/json" },
  // Allow large JSON bodies (reviews with many photos as data URIs, etc.)
  maxBodyLength: 50 * 1024 * 1024,
  maxContentLength: 50 * 1024 * 1024,
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("jwt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Helpers ───

function mapBackendCafe(raw: any, userLat?: number, userLng?: number): Cafe {
  const photos: string[] = raw.photos?.length
    ? raw.photos
        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
        .map((p: any) => p.url)
    : ["https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800"];

  // Map all backend facility keys to friendly display labels.
  // Multiple backend keys can map to the same label (e.g. wifi + strong_wifi → "WiFi").
  const FACILITY_KEY_MAP: Record<string, string> = {
    wifi: "WiFi",
    strong_wifi: "WiFi",
    power_outlet: "Power Outlet",
    power_outlets: "Power Outlet",
    mushola: "Mushola",
    prayer_room: "Mushola",
    parking: "Parking",
    kid_friendly: "Kid-Friendly",
    quiet_atmosphere: "Quiet Atmosphere",
    large_tables: "Large Tables",
    outdoor_area: "Outdoor Area",
    outdoor_seating: "Outdoor Area",
    cozy_seating: "Cozy Seating",
    ambient_lighting: "Ambient Lighting",
    intimate_seating: "Intimate Seating",
    noise_tolerant: "Family Friendly",
    spacious: "Spacious",
    whiteboard: "Whiteboard",
    bookable_space: "Bookable Space",
    smoking_area: "Smoking Area",
  };

  const rawFacilityLabels: string[] =
    raw.facilities
      ?.map((f: any) => {
        const key = typeof f === "string" ? f : f.facilityKey;
        if (!key) return null;
        return (
          FACILITY_KEY_MAP[key] ||
          // Prettify unknown keys: "foo_bar" → "Foo Bar"
          key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
        );
      })
      .filter(Boolean) || [];

  // Dedupe labels so "WiFi" doesn't appear twice when both wifi + strong_wifi are set
  const facilities: string[] = Array.from(new Set(rawFacilityLabels));

  // Group menu items by category
  const menuMap = new Map<
    string,
    { name: string; price: number; description?: string }[]
  >();
  if (raw.menus) {
    for (const item of raw.menus) {
      if (!item.isAvailable && item.isAvailable !== undefined) continue;
      const list = menuMap.get(item.category) || [];
      list.push({
        name: item.itemName,
        price: Number(item.price),
        description: item.description,
      });
      menuMap.set(item.category, list);
    }
  }
  const menu = Array.from(menuMap.entries()).map(([category, items]) => ({
    category,
    items,
  }));

  // Distance in km
  let distance = 0;
  if (raw.distanceMeters != null) {
    distance = Math.round(raw.distanceMeters / 100) / 10; // 1 decimal
  } else if (userLat != null && userLng != null) {
    distance = haversineKm(
      userLat,
      userLng,
      Number(raw.latitude),
      Number(raw.longitude),
    );
  }

  // Map promotion type
  let promotionType: "A" | "B" | undefined;
  let promoTitle: string | undefined;
  let promoDescription: string | undefined;
  let promoPhoto: string | undefined;
  if (raw.hasActivePromotion) {
    if (raw.activePromotionType === "new_cafe") {
      promotionType = "A";
    } else if (raw.activePromotionType === "featured_promo") {
      promotionType = "B";
      promoTitle =
        raw.promotion?.contentTitle ||
        raw.promotionContent?.title ||
        raw.promoTitle;
      promoDescription =
        raw.promotion?.contentDescription ||
        raw.promotionContent?.description ||
        raw.promoDescription;
      promoPhoto =
        raw.promotion?.contentPhotoUrl ||
        raw.promotionContent?.photoUrl ||
        raw.promoPhoto;
    }
  }

  return {
    id: String(raw.id),
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    photos,
    distance,
    address: raw.address || "",
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    purposes: raw.purposes || [],
    facilities: facilities as any[],
    menu,
    matchScore: raw.matchScore,
    favoritesCount: raw.favoritesCount || 0,
    bookmarksCount: raw.bookmarksCount || 0,
    wifiAvailable: raw.wifiAvailable,
    wifiSpeedMbps: raw.wifiSpeedMbps,
    hasMushola: raw.hasMushola,
    priceRange: raw.priceRange,
    promotionType,
    promoTitle,
    promoDescription,
    promoPhoto,
    hasActivePromotion: raw.hasActivePromotion,
    activePromotionType: raw.activePromotionType,
    // Scraped / enriched fields
    googleRating: raw.googleRating ?? null,
    totalGoogleReviews: raw.totalGoogleReviews ?? null,
    googleMapsUrl: raw.googleMapsUrl ?? null,
    website: raw.website ?? null,
    purposeScores: raw.purposeScores || {},
    detectedFacilities: raw.detectedFacilities || [],
  } as any;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return (
    Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
  );
}

// ─── Cafe APIs ───

export async function fetchCafes(
  lat: number,
  lng: number,
  radiusKm: number = 2,
  purposeId?: number,
): Promise<Cafe[]> {
  try {
    // Backend DTO caps radius at 50,000,000 m. If client passes a huge km,
    // clamp to avoid 400. This lets the DEV_DISABLE_RADIUS=9999km work without
    // overflowing the max.
    const radiusMeters = Math.min(radiusKm * 1000, 50_000_000);
    // No list cap for testing — request a large limit so backend returns all
    // matching cafes (DB has ~553). Backend DTO max raised to 1000 accordingly.
    const params: any = { lat, lng, radius: radiusMeters, limit: 1000 };
    if (purposeId) params.purposeId = purposeId;
    console.log(
      `[fetchCafes] GET /cafes lat=${lat} lng=${lng} radius=${radiusMeters}m limit=1000`,
    );
    const { data } = await api.get("/cafes", { params });
    const cafes = (data.data || data).map((c: any) =>
      mapBackendCafe(c, lat, lng),
    );
    console.log(`[fetchCafes] ✅ received ${cafes.length} cafes from backend`);
    return cafes;
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || "unknown";
    console.error(
      `[fetchCafes] ❌ FAILED — falling back to MOCK_CAFES. Reason:`,
      msg,
    );
    // Fallback to mock data with recalculated distances
    return MOCK_CAFES.map((c) => ({
      ...c,
      distance: haversineKm(lat, lng, c.latitude, c.longitude),
    })).filter((c) => c.distance <= radiusKm);
  }
}

export async function fetchCafeDetail(id: string): Promise<Cafe | null> {
  try {
    const { data } = await api.get(`/cafes/${id}`);
    return mapBackendCafe(data);
  } catch {
    return MOCK_CAFES.find((c) => c.id === id) || null;
  }
}

export async function fetchPromotedCafes(
  type?: string,
  userLat?: number,
  userLng?: number,
): Promise<Cafe[]> {
  try {
    const params = type ? { type } : {};
    const { data } = await api.get("/cafes/promoted", { params });
    return data.map((c: any) => mapBackendCafe(c, userLat, userLng));
  } catch {
    return MOCK_CAFES.filter((c) => c.promotionType);
  }
}

// ─── Purposes ───

export async function fetchPurposes(): Promise<BackendPurpose[]> {
  try {
    const { data } = await api.get("/purposes");
    return data;
  } catch {
    return [
      { id: 1, slug: "me-time", name: "Me Time", displayOrder: 0 },
      { id: 2, slug: "date", name: "Date", displayOrder: 1 },
      { id: 3, slug: "family-time", name: "Family Time", displayOrder: 2 },
      { id: 4, slug: "group-study", name: "Group Study", displayOrder: 3 },
      { id: 5, slug: "wfc", name: "WFC", displayOrder: 4 },
    ];
  }
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

export async function toggleBookmark(cafeId: string): Promise<boolean> {
  const { data } = await api.post(`/bookmarks/${cafeId}`);
  return data.bookmarked;
}

export async function toggleFavorite(cafeId: string): Promise<boolean> {
  const { data } = await api.post(`/favorites/${cafeId}`);
  return data.favorited;
}

export async function fetchBookmarks(): Promise<Cafe[]> {
  try {
    const { data } = await api.get("/bookmarks");
    return data.map((b: any) => mapBackendCafe(b.cafe));
  } catch {
    return [];
  }
}

export async function fetchFavorites(): Promise<Cafe[]> {
  try {
    const { data } = await api.get("/favorites");
    return data.map((f: any) => mapBackendCafe(f.cafe));
  } catch {
    return [];
  }
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
  try {
    const { data } = await api.get("/promotions/mine");
    return data;
  } catch {
    return [];
  }
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

export { haversineKm };
export default api;
