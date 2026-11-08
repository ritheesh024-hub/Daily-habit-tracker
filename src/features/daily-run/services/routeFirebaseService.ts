import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { SavedRouteDocument, PlannedRoute } from '../types';
import { runIndexedDB } from './runIndexedDB';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const routeFirebaseService = {
  /**
   * Saves a favourite route to Firestore (users/{userId}/savedRoutes/{routeId})
   * and caches it in local IndexedDB.
   */
  async saveRoute(
    userId: string,
    route: PlannedRoute | SavedRouteDocument
  ): Promise<{ success: boolean; routeId: string; error?: string }> {
    const routeId = 'id' in route ? route.id : route.routeId;
    const nowIso = new Date().toISOString();

    const docToSave: SavedRouteDocument = {
      routeId,
      userId,
      routeName: 'name' in route ? route.name : route.routeName,
      startLocation: {
        latitude: route.startLocation.latitude,
        longitude: route.startLocation.longitude,
        label: route.startLocation.label || 'Start Point',
      },
      waypoints: route.waypoints || [],
      routeCoordinates: (route.routeCoordinates || []).map((c) => ({
        latitude: Number(c.latitude.toFixed(6)),
        longitude: Number(c.longitude.toFixed(6)),
      })),
      distanceMeters: 'actualDistanceMeters' in route ? route.actualDistanceMeters : route.distanceMeters,
      elevationGainMeters: route.elevationGainMeters ?? null,
      targetDistanceKm: ('targetDistanceKm' in route && typeof route.targetDistanceKm === 'number') ? route.targetDistanceKm : null,
      createdAt: 'createdAt' in route ? route.createdAt : nowIso,
      updatedAt: nowIso,
    };

    // 1. Save locally to IndexedDB first
    await runIndexedDB.saveSavedRouteLocally(docToSave);

    // 2. If authenticated and online, save to Firestore
    if (userId && userId !== 'guest' && db) {
      const docPath = `users/${userId}/savedRoutes/${routeId}`;
      try {
        const routeDocRef = doc(db, 'users', userId, 'savedRoutes', routeId);
        await setDoc(routeDocRef, docToSave, { merge: true });
        return { success: true, routeId };
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.WRITE, docPath);
        } catch {
          // Return non-fatal error status while keeping local copy intact
          return {
            success: true,
            routeId,
            error: error instanceof Error ? error.message : 'Cached locally; cloud sync pending',
          };
        }
      }
    }

    return { success: true, routeId };
  },

  /**
   * Fetches saved routes for a user from Firestore, with fallback to IndexedDB
   */
  async getSavedRoutes(userId: string): Promise<SavedRouteDocument[]> {
    if (!userId || userId === 'guest' || !db) {
      return runIndexedDB.getSavedRoutesLocally(userId);
    }

    const collPath = `users/${userId}/savedRoutes`;
    try {
      const routesCol = collection(db, 'users', userId, 'savedRoutes');
      const q = query(routesCol, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);

      const routes: SavedRouteDocument[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SavedRouteDocument;
        routes.push(data);
        // Cache to local IndexedDB
        runIndexedDB.saveSavedRouteLocally(data).catch(() => {});
      });

      // Merge with any local offline routes
      const localRoutes = await runIndexedDB.getSavedRoutesLocally(userId);
      const cloudIds = new Set(routes.map((r) => r.routeId));
      for (const loc of localRoutes) {
        if (!cloudIds.has(loc.routeId)) {
          routes.push(loc);
        }
      }

      return routes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.warn('Failed to fetch saved routes from Firestore, reading local cache:', error);
      return runIndexedDB.getSavedRoutesLocally(userId);
    }
  },

  /**
   * Deletes a saved route from Firestore and local IndexedDB
   */
  async deleteRoute(userId: string, routeId: string): Promise<{ success: boolean; error?: string }> {
    // 1. Delete locally
    await runIndexedDB.deleteSavedRouteLocally(routeId);

    // 2. If authenticated and online, delete from Firestore
    if (userId && userId !== 'guest' && db) {
      const docPath = `users/${userId}/savedRoutes/${routeId}`;
      try {
        const routeDocRef = doc(db, 'users', userId, 'savedRoutes', routeId);
        await deleteDoc(routeDocRef);
        return { success: true };
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, docPath);
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : 'Failed to delete route' };
        }
      }
    }

    return { success: true };
  },
};
