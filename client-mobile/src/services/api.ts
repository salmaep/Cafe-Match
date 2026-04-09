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
const BASE_URL = "http://192.168.68.69:3000/api/v1";

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
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

  const facilities: string[] =
    raw.facilities?.map((f: any) => {
      const keyMap: Record<string, string> = {
        wifi: "WiFi",
        power_outlet: "Power Outlet",
        mushola: "Mushola",
        parking: "Parking",
        kid_friendly: "Kid-Friendly",
        quiet_atmosphere: "Quiet Atmosphere",
        large_tables: "Large Tables",
        outdoor_area: "Outdoor Area",
      };
      return keyMap[f.facilityKey] || f.facilityKey;
    }) || [];

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
  };
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
    const params: any = { lat, lng, radius: radiusKm * 1000 };
    if (purposeId) params.purposeId = purposeId;
    const { data } = await api.get("/cafes", { params });
    const cafes = (data.data || data).map((c: any) =>
      mapBackendCafe(c, lat, lng),
    );
    return cafes;
  } catch {
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

export async function fetchPromotedCafes(type?: string): Promise<Cafe[]> {
  try {
    const params = type ? { type } : {};
    const { data } = await api.get("/cafes/promoted", { params });
    return data.map((c: any) => mapBackendCafe(c));
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
  };
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get("/auth/me");
  return {
    id: String(data.id),
    name: data.name,
    email: data.email,
    role: data.role,
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

export { haversineKm };
export default api;
