import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  fetchActiveCafeIdsApi,
  fetchMyActiveTableApi,
  fetchMyRequestsApi,
  MyActiveTable,
  MyOutgoingRequest,
  openTableApi,
  closeTableApi,
  acceptJoinRequestApi,
  declineJoinRequestApi,
  cancelJoinRequestApi,
  OpenTablePayload,
} from '../services/api';

const ACTIVE_CAFES_POLL_MS = 30_000;
const MY_ACTIVE_POLL_MS = 15_000;
const MY_REQUESTS_POLL_MS = 30_000;

interface Ctx {
  activeCafeIds: Set<number>;
  myActive: MyActiveTable | null;
  myRequests: MyOutgoingRequest[];
  pendingRequestCount: number;
  refresh: () => Promise<void>;
  create: (payload: OpenTablePayload) => Promise<{ id: number }>;
  closeMine: () => Promise<void>;
  acceptRequest: (requestId: number) => Promise<void>;
  declineRequest: (requestId: number) => Promise<void>;
  cancelRequest: (requestId: number) => Promise<void>;
}

const OpenTablesContext = createContext<Ctx | null>(null);

export const useOpenTables = () => {
  const ctx = useContext(OpenTablesContext);
  if (!ctx)
    throw new Error('useOpenTables must be used within OpenTablesProvider');
  return ctx;
};

export function OpenTablesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeCafeIds, setActiveCafeIds] = useState<Set<number>>(new Set());
  const [myActive, setMyActive] = useState<MyActiveTable | null>(null);
  const [myRequests, setMyRequests] = useState<MyOutgoingRequest[]>([]);

  const refreshActiveCafes = useCallback(async () => {
    try {
      const ids = await fetchActiveCafeIdsApi();
      setActiveCafeIds(new Set(ids));
    } catch {}
  }, []);

  const refreshMyActive = useCallback(async () => {
    if (!user) {
      setMyActive(null);
      return;
    }
    try {
      const t = await fetchMyActiveTableApi();
      setMyActive(t);
    } catch {
      setMyActive(null);
    }
  }, [user]);

  const refreshMyRequests = useCallback(async () => {
    if (!user) {
      setMyRequests([]);
      return;
    }
    try {
      const rows = await fetchMyRequestsApi();
      setMyRequests(rows);
    } catch {
      setMyRequests([]);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshActiveCafes(),
      refreshMyActive(),
      refreshMyRequests(),
    ]);
  }, [refreshActiveCafes, refreshMyActive, refreshMyRequests]);

  useEffect(() => {
    refreshActiveCafes();
    const iv = setInterval(refreshActiveCafes, ACTIVE_CAFES_POLL_MS);
    return () => clearInterval(iv);
  }, [refreshActiveCafes]);

  useEffect(() => {
    refreshMyActive();
    if (!user) return;
    const iv = setInterval(refreshMyActive, MY_ACTIVE_POLL_MS);
    return () => clearInterval(iv);
  }, [refreshMyActive, user]);

  useEffect(() => {
    refreshMyRequests();
    if (!user) return;
    const iv = setInterval(refreshMyRequests, MY_REQUESTS_POLL_MS);
    return () => clearInterval(iv);
  }, [refreshMyRequests, user]);

  const create = useCallback(
    async (payload: OpenTablePayload) => {
      const res = await openTableApi(payload);
      await refresh();
      return res;
    },
    [refresh],
  );

  const closeMine = useCallback(async () => {
    if (!myActive) return;
    await closeTableApi(myActive.id);
    await refresh();
  }, [myActive, refresh]);

  const acceptRequest = useCallback(
    async (requestId: number) => {
      await acceptJoinRequestApi(requestId);
      await refresh();
    },
    [refresh],
  );

  const declineRequest = useCallback(
    async (requestId: number) => {
      await declineJoinRequestApi(requestId);
      await refresh();
    },
    [refresh],
  );

  const cancelRequest = useCallback(
    async (requestId: number) => {
      await cancelJoinRequestApi(requestId);
      await refresh();
    },
    [refresh],
  );

  const pendingRequestCount = myActive?.pendingRequests?.length ?? 0;

  const value = useMemo<Ctx>(
    () => ({
      activeCafeIds,
      myActive,
      myRequests,
      pendingRequestCount,
      refresh,
      create,
      closeMine,
      acceptRequest,
      declineRequest,
      cancelRequest,
    }),
    [
      activeCafeIds,
      myActive,
      myRequests,
      pendingRequestCount,
      refresh,
      create,
      closeMine,
      acceptRequest,
      declineRequest,
      cancelRequest,
    ],
  );

  return (
    <OpenTablesContext.Provider value={value}>
      {children}
    </OpenTablesContext.Provider>
  );
}
