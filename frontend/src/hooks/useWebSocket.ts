import { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { DashboardData } from '../types';
import axios from 'axios';

type SharedData = Partial<DashboardData> & { secondsAgo?: number; mode?: string; simulation_scenario?: string };

export interface PageCacheData {
  processes: any[];
  networkConnections: any[];
  networkStats: any;
  authEvents: any;
  alerts: any[];
  timeline: any[];
  history: any[];
  riskHistory: any[];
  scenarios: any[];
}

// Module-level shared state — survives navigation (component unmount/remount)
let sharedData: SharedData = {};
let lastReceiveTime = Date.now();
let subscribers = 0;

// Persistent Page Data Cache (Instant Zero-Flicker across all pages)
let pageCache: PageCacheData = {
  processes: [],
  networkConnections: [],
  networkStats: { upload_rate: 0, download_rate: 0, connection_count: 0 },
  authEvents: { status: 'Available', events: [] },
  alerts: [],
  timeline: [],
  history: [],
  riskHistory: [],
  scenarios: []
};

// Track whether the shared stream infrastructure is running
let streamBootstrapped = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let tickerInterval: ReturnType<typeof setInterval> | null = null;
let bgRefreshInterval: ReturnType<typeof setInterval> | null = null;
let wsUnsubscribe: (() => void) | null = null;
let initialFetchInFlight = false;
let fallbackPollInFlight = false;

const listeners = new Set<(data: SharedData) => void>();
const pageCacheListeners = new Set<(cache: PageCacheData) => void>();

const publish = (patch: SharedData) => {
  sharedData = { ...sharedData, ...patch };
  listeners.forEach((listener) => listener(sharedData));
};

const publishCache = (patch: Partial<PageCacheData>) => {
  pageCache = { ...pageCache, ...patch };
  pageCacheListeners.forEach((listener) => listener(pageCache));
};

export const fetchAllPageData = async () => {
  try {
    const [
      resProcs, resConns, resStats, resAuth,
      resAlerts, resTimeline, resHistory, resRiskHist, resScenarios
    ] = await Promise.allSettled([
      axios.get('/api/processes'),
      axios.get('/api/network/connections'),
      axios.get('/api/network/stats'),
      axios.get('/api/security/auth-events'),
      axios.get('/api/alerts'),
      axios.get('/api/security/timeline'),
      axios.get('/api/telemetry/history?limit=150&hours=24'),
      axios.get('/api/security/risk/history?limit=150&hours=24'),
      axios.get('/api/simulation/scenarios')
    ]);

    const cachePatch: Partial<PageCacheData> = {};
    if (resProcs.status === 'fulfilled' && Array.isArray(resProcs.value.data)) cachePatch.processes = resProcs.value.data;
    if (resConns.status === 'fulfilled' && Array.isArray(resConns.value.data)) cachePatch.networkConnections = resConns.value.data;
    if (resStats.status === 'fulfilled' && resStats.value.data) cachePatch.networkStats = resStats.value.data;
    if (resAuth.status === 'fulfilled' && resAuth.value.data) cachePatch.authEvents = resAuth.value.data;
    if (resAlerts.status === 'fulfilled' && Array.isArray(resAlerts.value.data)) cachePatch.alerts = resAlerts.value.data;
    if (resTimeline.status === 'fulfilled' && Array.isArray(resTimeline.value.data)) cachePatch.timeline = resTimeline.value.data;
    if (resHistory.status === 'fulfilled' && Array.isArray(resHistory.value.data)) cachePatch.history = resHistory.value.data;
    if (resRiskHist.status === 'fulfilled' && Array.isArray(resRiskHist.value.data)) cachePatch.riskHistory = resRiskHist.value.data;
    if (resScenarios.status === 'fulfilled' && Array.isArray(resScenarios.value.data)) cachePatch.scenarios = resScenarios.value.data;

    publishCache(cachePatch);
  } catch (err) {
    console.debug('Background page cache pre-fetch error:', err);
  }
};

const fetchInitialData = async () => {
  if (initialFetchInFlight) return;
  initialFetchInFlight = true;
  try {
    const [resTel, resTwin, resRisk, resMl, resSim] = await Promise.allSettled([
      axios.get('/api/telemetry/current'),
      axios.get('/api/twin/state'),
      axios.get('/api/security/risk'),
      axios.get('/api/ml/status'),
      axios.get('/api/simulation/status')
    ]);

    const initial: SharedData = {};
    if (resTel.status === 'fulfilled' && resTel.value.data) {
      initial.telemetry = resTel.value.data;
      initial.mode = resTel.value.data.is_simulation ? 'SIMULATION' : 'LIVE';
    }
    if (resTwin.status === 'fulfilled' && resTwin.value.data) {
      initial.digital_twin = resTwin.value.data;
    }
    if (resRisk.status === 'fulfilled' && resRisk.value.data) {
      initial.risk = resRisk.value.data;
      initial.risk_score = resRisk.value.data;
    }
    if (resMl.status === 'fulfilled' && resMl.value.data) {
      initial.ml_result = resMl.value.data;
    }
    if (resSim.status === 'fulfilled' && resSim.value.data) {
      initial.simulation = resSim.value.data;
      if (resSim.value.data?.scenario_name) {
        initial.simulation_scenario = resSim.value.data.scenario_name;
      }
    }

    lastReceiveTime = Date.now();
    publish({ ...initial, secondsAgo: 0 });

    // In parallel, seed page data cache
    fetchAllPageData();
  } catch (err) {
    console.error('Initial state fetch error', err);
  } finally {
    initialFetchInFlight = false;
  }
};

/**
 * Bootstrap the shared stream once.
 * Never tears it down on navigation — only disconnects WebSocket when truly zero subscribers.
 */
const ensureSharedStream = () => {
  if (streamBootstrapped) return;
  streamBootstrapped = true;

  // 1. Fetch seed data and prefetch all page cache once
  fetchInitialData();

  // 2. Connect WebSocket (singleton — connect() guards against double-open)
  const token = localStorage.getItem('token') || 'analyst-token';
  wsService.connect(token);

  // 3. Subscribe to WebSocket messages once
  if (!wsUnsubscribe) {
    wsUnsubscribe = wsService.onMessage((msg: any) => {
      const payload = msg?.data || msg;
      if (!payload) return;

      lastReceiveTime = Date.now();
      // Only patch fields that are present in the message — never overwrite with undefined
      const patch: SharedData = { secondsAgo: 0 };
      if (payload.telemetry) patch.telemetry = payload.telemetry;
      if (payload.digital_twin) patch.digital_twin = payload.digital_twin;
      if (payload.risk || payload.risk_score) {
        patch.risk = payload.risk || payload.risk_score;
        patch.risk_score = payload.risk || payload.risk_score;
      }
      if (payload.ml_result) patch.ml_result = payload.ml_result;
      if (payload.heuristics !== undefined) patch.heuristics = payload.heuristics;
      if (payload.simulation_scenario !== undefined) patch.simulation_scenario = payload.simulation_scenario;
      if (payload.mode) patch.mode = payload.mode.toUpperCase();
      else if (payload.telemetry?.is_simulation !== undefined) {
        patch.mode = payload.telemetry.is_simulation ? 'SIMULATION' : 'LIVE';
      }
      // Pass through extra top-level keys (processes, network, auth_events, etc.)
      for (const key of Object.keys(payload)) {
        if (!(key in patch)) (patch as any)[key] = payload[key];
      }
      publish(patch);

      // Also patch real-time data into pageCache if present
      if (payload.auth_events) {
        publishCache({ authEvents: payload.auth_events });
      }
    });
  }

  // 4. Fallback poll at 5s — only when WebSocket data is stale
  if (!pollInterval) {
    pollInterval = setInterval(async () => {
      if (fallbackPollInFlight) return;
      if (Date.now() - lastReceiveTime < 6000) return;
      fallbackPollInFlight = true;
      try {
        const resTel = await axios.get('/api/telemetry/current');
        if (resTel.data) {
          lastReceiveTime = Date.now();
          publish({
            telemetry: resTel.data,
            mode: resTel.data.is_simulation ? 'SIMULATION' : 'LIVE',
            secondsAgo: 0
          });
        }
      } catch {
        // WebSocket reconnect remains the primary recovery path
      } finally {
        fallbackPollInFlight = false;
      }
    }, 5000);
  }

  // 5. Seconds-ago ticker
  if (!tickerInterval) {
    tickerInterval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - lastReceiveTime) / 1000));
      publish({ secondsAgo: elapsed });
    }, 1000);
  }

  // 6. Background page cache refresh (every 4.5s) to guarantee zero-flicker on every page
  if (!bgRefreshInterval) {
    bgRefreshInterval = setInterval(() => {
      fetchAllPageData();
    }, 4500);
  }
};

const teardownSharedStream = () => {
  if (subscribers > 0) return;

  streamBootstrapped = false;

  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  if (tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
  if (bgRefreshInterval) { clearInterval(bgRefreshInterval); bgRefreshInterval = null; }
  if (wsUnsubscribe) { wsUnsubscribe(); wsUnsubscribe = null; }
  wsService.disconnect();
  fallbackPollInFlight = false;
};

export function useWebSocket() {
  const [data, setData] = useState<SharedData>(sharedData);

  useEffect(() => {
    subscribers += 1;
    listeners.add(setData);
    if (Object.keys(sharedData).length > 0) setData(sharedData);
    ensureSharedStream();

    return () => {
      listeners.delete(setData);
      subscribers = Math.max(0, subscribers - 1);
      teardownSharedStream();
    };
  }, []);

  return data as any;
}

export function usePageCache(): PageCacheData {
  const [cache, setCache] = useState<PageCacheData>(pageCache);

  useEffect(() => {
    pageCacheListeners.add(setCache);
    if (pageCache.processes.length > 0 || pageCache.alerts.length > 0 || pageCache.timeline.length > 0) {
      setCache({ ...pageCache });
    }
    ensureSharedStream();

    return () => {
      pageCacheListeners.delete(setCache);
    };
  }, []);

  return cache;
}
