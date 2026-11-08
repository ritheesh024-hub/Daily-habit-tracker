import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runIndexedDB } from '../services/runIndexedDB';
import { LocalRunRecord, PersistedActiveSession } from '../types';

describe('Phase 5: Offline Storage, IndexedDB & Sync Queue', () => {
  it('saves, retrieves, and clears active session for crash recovery', async () => {
    const testSession: PersistedActiveSession = {
      runId: 'run_recovery_test_1',
      userId: 'test_user_abc',
      title: 'Lunch Run',
      status: 'running',
      startTime: '2026-11-07T12:00:00.000Z',
      endTime: null,
      durationSeconds: 300,
      accumulatedActiveMs: 300000,
      activeSegmentStartTime: 1731000000000,
      totalDistanceMeters: 1250,
      metrics: {
        distanceKm: 1.25,
        durationSeconds: 300,
        currentSpeedKmh: 15.0,
        averageSpeedKmh: 15.0,
        currentPaceMinPerKm: 4.0,
        averagePaceMinPerKm: 4.0,
        caloriesBurned: 90,
        isStationary: false,
        elevationGainMeters: null,
      },
      segments: [
        {
          id: 'seg_1',
          points: [
            { latitude: 37.7749, longitude: -122.4194, timestamp: 1731000000000 },
            { latitude: 37.7755, longitude: -122.4194, timestamp: 1731000060000 },
          ],
        },
      ],
      startPosition: { latitude: 37.7749, longitude: -122.4194, timestamp: 1731000000000 },
      currentPosition: { latitude: 37.7755, longitude: -122.4194, timestamp: 1731000060000 },
      lastSavedAt: Date.now(),
    };

    // 1. Save active session
    await runIndexedDB.saveActiveSession(testSession);

    // 2. Retrieve active session
    const retrieved = await runIndexedDB.getActiveSession('test_user_abc');
    assert(retrieved !== null, 'Active session should be retrieved');
    assert.strictEqual(retrieved?.runId, 'run_recovery_test_1');
    assert.strictEqual(retrieved?.durationSeconds, 300);
    assert.strictEqual(retrieved?.totalDistanceMeters, 1250);
    assert.strictEqual(retrieved?.segments.length, 1);

    // 3. Clear active session after finish
    await runIndexedDB.clearActiveSession('test_user_abc');
    const cleared = await runIndexedDB.getActiveSession('test_user_abc');
    assert.strictEqual(cleared, null, 'Active session should be cleared after finish/discard');
  });

  it('saves completed runs locally with pending sync status and sorts newest first', async () => {
    const run1: LocalRunRecord = {
      runId: 'run_comp_1',
      userId: 'test_user_xyz',
      title: 'Run 1',
      distanceMeters: 5000,
      durationSeconds: 1500,
      averagePaceSecondsPerKm: 300,
      averageSpeedKmh: 12.0,
      caloriesEstimate: 350,
      notes: null,
      routeCoordinates: [
        { latitude: 37.7749, longitude: -122.4194, timestamp: 1000, accuracy: 5 },
      ],
      routePointCount: 1,
      startedAt: '2026-11-07T08:00:00.000Z',
      endedAt: '2026-11-07T08:25:00.000Z',
      createdAt: '2026-11-07T08:25:00.000Z',
      updatedAt: '2026-11-07T08:25:00.000Z',
      status: 'completed',
      syncStatus: 'pending',
    };

    const run2: LocalRunRecord = {
      runId: 'run_comp_2',
      userId: 'test_user_xyz',
      title: 'Run 2 - Newer',
      distanceMeters: 3000,
      durationSeconds: 900,
      averagePaceSecondsPerKm: 300,
      averageSpeedKmh: 12.0,
      caloriesEstimate: 210,
      notes: null,
      routeCoordinates: [
        { latitude: 37.7749, longitude: -122.4194, timestamp: 2000, accuracy: 5 },
      ],
      routePointCount: 1,
      startedAt: '2026-11-07T10:00:00.000Z',
      endedAt: '2026-11-07T10:15:00.000Z',
      createdAt: '2026-11-07T10:15:00.000Z',
      updatedAt: '2026-11-07T10:15:00.000Z',
      status: 'completed',
      syncStatus: 'synced',
    };

    await runIndexedDB.saveCompletedRun(run1);
    await runIndexedDB.saveCompletedRun(run2);

    // Retrieve all completed runs
    const allRuns = await runIndexedDB.getCompletedRuns('test_user_xyz');
    assert.strictEqual(allRuns.length, 2);
    // Newest first check: run2 (10:00) should appear before run1 (08:00)
    assert.strictEqual(allRuns[0].runId, 'run_comp_2');
    assert.strictEqual(allRuns[1].runId, 'run_comp_1');

    // Retrieve pending runs check: only run1 has syncStatus: 'pending'
    const pending = await runIndexedDB.getPendingSyncRuns('test_user_xyz');
    assert.strictEqual(pending.length, 1);
    assert.strictEqual(pending[0].runId, 'run_comp_1');
    assert.strictEqual(pending[0].syncStatus, 'pending');
  });

  it('updates sync status and handles retry count transitions', async () => {
    // Transition run1 from 'pending' to 'synced'
    await runIndexedDB.updateRunSyncStatus('run_comp_1', 'synced');
    const updated = await runIndexedDB.getRunById('run_comp_1');
    assert.strictEqual(updated?.syncStatus, 'synced');
    assert(updated?.syncedAt != null, 'syncedAt timestamp should be set');

    // Now pending runs should be empty
    const pendingAfter = await runIndexedDB.getPendingSyncRuns('test_user_xyz');
    assert.strictEqual(pendingAfter.length, 0);

    // Transition run to 'failed' and check retryCount increment
    await runIndexedDB.updateRunSyncStatus('run_comp_1', 'failed', 'Network timeout');
    const failedRun = await runIndexedDB.getRunById('run_comp_1');
    assert.strictEqual(failedRun?.syncStatus, 'failed');
    assert.strictEqual(failedRun?.syncError, 'Network timeout');
    assert.strictEqual(failedRun?.retryCount, 1);
  });

  it('enforces account isolation (different users cannot read each others local runs)', async () => {
    const userA_run: LocalRunRecord = {
      runId: 'user_a_private_run',
      userId: 'user_A_id',
      title: 'Private Run A',
      distanceMeters: 4000,
      durationSeconds: 1200,
      averagePaceSecondsPerKm: 300,
      averageSpeedKmh: 12.0,
      caloriesEstimate: 280,
      notes: null,
      routeCoordinates: [],
      routePointCount: 0,
      startedAt: '2026-11-07T09:00:00.000Z',
      endedAt: '2026-11-07T09:20:00.000Z',
      createdAt: '2026-11-07T09:20:00.000Z',
      updatedAt: '2026-11-07T09:20:00.000Z',
      status: 'completed',
      syncStatus: 'pending',
    };

    await runIndexedDB.saveCompletedRun(userA_run);

    const userB_runs = await runIndexedDB.getCompletedRuns('user_B_id');
    const userB_has_A = userB_runs.some((r) => r.runId === 'user_a_private_run');
    assert.strictEqual(userB_has_A, false, 'User B must not see User A runs in local storage');

    const userA_pending = await runIndexedDB.getPendingSyncRuns('user_A_id');
    assert.strictEqual(userA_pending.length, 1);
    assert.strictEqual(userA_pending[0].runId, 'user_a_private_run');
  });

  it('guarantees idempotent runId duplicate prevention', async () => {
    // When saving the same runId twice, it overwrites the existing record rather than creating a duplicate
    const testRunId = 'idempotent_test_run_99';
    const firstSave: LocalRunRecord = {
      runId: testRunId,
      userId: 'idempotent_user',
      title: 'Original Title',
      distanceMeters: 2000,
      durationSeconds: 600,
      averagePaceSecondsPerKm: 300,
      averageSpeedKmh: 12.0,
      caloriesEstimate: 140,
      notes: null,
      routeCoordinates: [],
      routePointCount: 0,
      startedAt: '2026-11-07T11:00:00.000Z',
      endedAt: '2026-11-07T11:10:00.000Z',
      createdAt: '2026-11-07T11:10:00.000Z',
      updatedAt: '2026-11-07T11:10:00.000Z',
      status: 'completed',
      syncStatus: 'pending',
    };

    const secondSave: LocalRunRecord = {
      ...firstSave,
      title: 'Updated Title After Sync',
      syncStatus: 'synced',
    };

    await runIndexedDB.saveCompletedRun(firstSave);
    await runIndexedDB.saveCompletedRun(secondSave);

    const userRuns = await runIndexedDB.getCompletedRuns('idempotent_user');
    const matchedRuns = userRuns.filter((r) => r.runId === testRunId);
    assert.strictEqual(matchedRuns.length, 1, 'Exactly 1 record must exist for the runId');
    assert.strictEqual(matchedRuns[0].title, 'Updated Title After Sync');
    assert.strictEqual(matchedRuns[0].syncStatus, 'synced');
  });
});
