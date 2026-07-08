import apiClient from "./client";

export type TableGenderRule = "any" | "female_only" | "male_only";
export type JoinRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "canceled"
  | "expired";

export interface TableUser {
  id: number;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface OpenTable {
  id: number;
  title: string | null;
  maxGuests: number;
  acceptedCount: number;
  genderRule: TableGenderRule;
  friendsOnly: boolean;
  openedAt: string;
  expiresAt: string;
  host: TableUser;
  myRequestStatus: JoinRequestStatus | null;
  isMine: boolean;
}

export interface MyTable {
  id: number;
  status: "open" | "closed" | "expired";
  title: string | null;
  maxGuests: number;
  genderRule: TableGenderRule;
  friendsOnly: boolean;
  openedAt: string;
  expiresAt: string;
  cafe: { id: number; name: string; slug: string | null } | null;
  acceptedCount: number;
  members: (TableUser | null)[];
  pendingRequests: {
    id: number;
    message: string | null;
    createdAt: string;
    user: TableUser | null;
  }[];
}

export interface MyJoinRequest {
  id: number;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  table: {
    id: number;
    title: string | null;
    status: "open" | "closed" | "expired";
    expiresAt: string;
    cafe: { id: number; name: string; slug: string | null } | null;
    host: TableUser | null;
  } | null;
}

export interface OpenTableInput {
  cafeId: number;
  title?: string;
  maxGuests?: number;
  genderRule?: TableGenderRule;
  friendsOnly?: boolean;
}

export const tablesApi = {
  open: (data: OpenTableInput) => apiClient.post<MyTable>("/tables", data),

  myActive: () => apiClient.get<MyTable | null>("/tables/me/active"),

  myRequests: () => apiClient.get<MyJoinRequest[]>("/tables/me/requests"),

  close: (tableId: number) => apiClient.put(`/tables/${tableId}/close`),

  listByCafe: (cafeId: number) =>
    apiClient.get<OpenTable[]>(`/tables/cafe/${cafeId}`),

  /** Public — cafes that currently have ≥1 open table (emerald pins). */
  activeCafes: () =>
    apiClient.get<{ cafeIds: number[] }>("/tables/active-cafes"),

  requestJoin: (tableId: number, message?: string) =>
    apiClient.post(`/tables/${tableId}/requests`, { message }),

  accept: (requestId: number) =>
    apiClient.put(`/tables/requests/${requestId}/accept`),

  decline: (requestId: number) =>
    apiClient.put(`/tables/requests/${requestId}/decline`),

  cancel: (requestId: number) =>
    apiClient.put(`/tables/requests/${requestId}/cancel`),
};
