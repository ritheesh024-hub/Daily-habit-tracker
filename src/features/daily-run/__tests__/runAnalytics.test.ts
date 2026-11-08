import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  filterRunsByTimeRange,
  calculateRunningOverview,
  calculatePersonalRecords,
  calculateStreaksAndConsistency,
  calculateProgressInsights,
  groupRunsForChart,
  getLocalDateString,
} from '../utils/runAnalytics';
import { LocalRunRecord } from '../types';

describe('Phase 7: Running History, Analytics & Performance Insights', () => {
  it('1. Handles user with no running history (empty array) gracefully', () => {
    const overview = calculateRunningOverview([]);
    assert.strictEqual(overview.totalDistanceKm, 0);
    assert.strictEqual(overview.totalRuns, 0);
    assert.strictEqual(overview.totalDurationSeconds, 0);
    assert.strictEqual(overview.averageDistanceKm, 0);
    assert.strictEqual(overview.averagePaceMinPerKm, null);
    assert.strictEqual(overview.averageSpeedKmh, null);

    const records = calculatePersonalRecords([]);
    assert.deepStrictEqual(records, []);

    const streaks = calculateStreaksAndConsistency([]);
    assert.strictEqual(streaks.currentStreakDays, 0);
    assert.strictEqual(streaks.longestStreakDays, 0);
    assert.strictEqual(streaks.totalRunningDays, 0);

    const insights = calculateProgressInsights([], 'this_month');
    assert.strictEqual(insights.length, 1);
    assert.strictEqual(insights[0].type, 'info');

    const chart = groupRunsForChart([], 'this_week');
    assert.deepStrictEqual(chart, []);
  });

  it('2. Handles user with a single completed run correctly', () => {
    const run: LocalRunRecord = {
      runId: 'run_single_1',
      userId: 'test_u',
      title: 'First 5K',
      distanceMeters: 5000,
      durationSeconds: 1500, // 25 min -> 5:00 min/km, 12 km/h
      averagePaceSecondsPerKm: 300,
      averageSpeedKmh: 12.0,
      caloriesEstimate: 360,
      routeCoordinates: [],
      routePointCount: 0,
      startedAt: '2026-11-07T08:00:00.000Z',
      endedAt: '2026-11-07T08:25:00.000Z',
      createdAt: '2026-11-07T08:25:00.000Z',
      updatedAt: '2026-11-07T08:25:00.000Z',
      status: 'completed',
      syncStatus: 'synced',
    };

    const overview = calculateRunningOverview([run]);
    assert.strictEqual(overview.totalDistanceKm, 5);
    assert.strictEqual(overview.totalRuns, 1);
    assert.strictEqual(overview.totalDurationSeconds, 1500);
    assert.strictEqual(overview.averageDistanceKm, 5);
    assert.strictEqual(overview.averagePaceMinPerKm, 5.0);
    assert.strictEqual(overview.averageSpeedKmh, 12.0);
    assert.strictEqual(overview.longestDistanceKm, 5);

    const records = calculatePersonalRecords([run]);
    assert(records.length >= 4); // longest distance, fastest pace, highest speed, longest duration
    const distRecord = records.find((r) => r.type === 'longest_distance');
    assert.strictEqual(distRecord?.valueFormatted, '5 km');
  });

  it('3. Filters runs by time range (this_week, this_month, custom)', () => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    const runToday: LocalRunRecord = {
      runId: 'run_today',
      userId: 'user_1',
      title: 'Today Run',
      distanceMeters: 3000,
      durationSeconds: 900,
      averagePaceSecondsPerKm: 300,
      averageSpeedKmh: 12.0,
      caloriesEstimate: 200,
      routeCoordinates: [],
      routePointCount: 0,
      startedAt: `${todayStr}T09:00:00.000Z`,
      endedAt: `${todayStr}T09:15:00.000Z`,
      createdAt: `${todayStr}T09:15:00.000Z`,
      updatedAt: `${todayStr}T09:15:00.000Z`,
      status: 'completed',
      syncStatus: 'synced',
    };

    const runLastYear: LocalRunRecord = {
      runId: 'run_last_year',
      userId: 'user_1',
      title: 'Old Run',
      distanceMeters: 10000,
      durationSeconds: 3000,
      averagePaceSecondsPerKm: 300,
      averageSpeedKmh: 12.0,
      caloriesEstimate: 700,
      routeCoordinates: [],
      routePointCount: 0,
      startedAt: '2025-01-01T09:00:00.000Z',
      endedAt: '2025-01-01T09:50:00.000Z',
      createdAt: '2025-01-01T09:50:00.000Z',
      updatedAt: '2025-01-01T09:50:00.000Z',
      status: 'completed',
      syncStatus: 'synced',
    };

    const allRuns = [runToday, runLastYear];

    // Filter: this_month should contain runToday but NOT runLastYear
    const monthFiltered = filterRunsByTimeRange(allRuns, 'this_month');
    assert.strictEqual(monthFiltered.length, 1);
    assert.strictEqual(monthFiltered[0].runId, 'run_today');

    // Filter: all_time should contain both
    const allFiltered = filterRunsByTimeRange(allRuns, 'all_time');
    assert.strictEqual(allFiltered.length, 2);

    // Filter: custom range
    const customFiltered = filterRunsByTimeRange(allRuns, 'custom', '2024-12-01', '2025-02-01');
    assert.strictEqual(customFiltered.length, 1);
    assert.strictEqual(customFiltered[0].runId, 'run_last_year');
  });

  it('4. Enforces minimum distance and quality criteria for fastest pace personal records', () => {
    // 100m run with unrealistically fast GPS pace (e.g. 1:30 min/km due to glitch or sprint)
    const shortGlitchRun: LocalRunRecord = {
      runId: 'glitch_run',
      userId: 'user_1',
      title: 'Glitchy 100m sprint',
      distanceMeters: 100, // < 1.0 km!
      durationSeconds: 15,
      averagePaceSecondsPerKm: 150, // 2:30 min/km
      averageSpeedKmh: 24.0,
      caloriesEstimate: 10,
      routeCoordinates: [],
      routePointCount: 0,
      startedAt: '2026-11-01T09:00:00.000Z',
      endedAt: '2026-11-01T09:00:15.000Z',
      createdAt: '2026-11-01T09:00:15.000Z',
      updatedAt: '2026-11-01T09:00:15.000Z',
      status: 'completed',
      syncStatus: 'synced',
    };

    // Valid 5K run with 4:30 min/km pace (270 sec/km)
    const validRun: LocalRunRecord = {
      runId: 'valid_5k',
      userId: 'user_1',
      title: 'Real 5K',
      distanceMeters: 5000, // >= 1.0 km
      durationSeconds: 1350,
      averagePaceSecondsPerKm: 270,
      averageSpeedKmh: 13.33,
      caloriesEstimate: 360,
      routeCoordinates: [],
      routePointCount: 0,
      startedAt: '2026-11-02T09:00:00.000Z',
      endedAt: '2026-11-02T09:22:30.000Z',
      createdAt: '2026-11-02T09:22:30.000Z',
      updatedAt: '2026-11-02T09:22:30.000Z',
      status: 'completed',
      syncStatus: 'synced',
    };

    const records = calculatePersonalRecords([shortGlitchRun, validRun]);
    const paceRecord = records.find((r) => r.type === 'fastest_pace');
    assert(paceRecord != null, 'Should have a fastest pace record');
    assert.strictEqual(paceRecord?.runId, 'valid_5k', 'Glitchy run under 1km must be excluded');
    assert.strictEqual(paceRecord?.valueFormatted, '4:30 /km');
  });

  it('5. Accurately calculates consecutive streaks and multi-run day aggregations', () => {
    // 3 consecutive days in local format
    const runs: LocalRunRecord[] = [
      {
        runId: 'r1',
        userId: 'u',
        title: 'Run D1',
        distanceMeters: 3000,
        durationSeconds: 900,
        status: 'completed',
        startedAt: '2026-10-10T10:00:00.000Z',
        createdAt: '2026-10-10T10:00:00.000Z',
      } as any,
      {
        runId: 'r2_morning',
        userId: 'u',
        title: 'Run D2 Morning',
        distanceMeters: 4000,
        durationSeconds: 1200,
        status: 'completed',
        startedAt: '2026-10-11T08:00:00.000Z',
        createdAt: '2026-10-11T08:00:00.000Z',
      } as any,
      {
        runId: 'r2_evening',
        userId: 'u',
        title: 'Run D2 Evening',
        distanceMeters: 4000,
        durationSeconds: 1200,
        status: 'completed',
        startedAt: '2026-10-11T18:00:00.000Z',
        createdAt: '2026-10-11T18:00:00.000Z',
      } as any,
      {
        runId: 'r3',
        userId: 'u',
        title: 'Run D3',
        distanceMeters: 5000,
        durationSeconds: 1500,
        status: 'completed',
        startedAt: '2026-10-12T09:00:00.000Z',
        createdAt: '2026-10-12T09:00:00.000Z',
      } as any,
    ];

    const streaks = calculateStreaksAndConsistency(runs);
    assert.strictEqual(streaks.longestStreakDays, 3, 'Consecutive D1, D2, D3 should yield a 3-day streak');
    assert.strictEqual(streaks.totalRunningDays, 3, 'Multiple runs on D2 should count as 1 running day');

    const records = calculatePersonalRecords(runs);
    const mostRunsDay = records.find((r) => r.type === 'most_runs_day');
    assert(mostRunsDay != null);
    assert.strictEqual(mostRunsDay?.valueFormatted, '2 runs');

    const mostDistanceDay = records.find((r) => r.type === 'most_distance_day');
    assert(mostDistanceDay != null);
    assert.strictEqual(mostDistanceDay?.valueFormatted, '8 km', '4km + 4km on D2 should yield 8 km');
  });
});
