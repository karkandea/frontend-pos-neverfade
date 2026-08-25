import axios from "axios";

import api, { ApiNetworkError } from "./api";

const QUEUE_KEY = "nfpos_login_telemetry_queue";
const MAX_QUEUE_SIZE = 10;

type NetworkConnection = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
};

type LoginFailureTelemetry = {
  clientEventId: string;
  occurredAt: string;
  errorCode: string;
  errorName: string;
  errorMessage: string;
  httpStatus: number | null;
  online: boolean;
  durationMs: number;
  targetOrigin: string;
  visibilityState: string;
  effectiveConnectionType: string;
  rttMs: number | null;
  downlinkMbps: number | null;
};

function safeText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.slice(0, maxLength)
    : "";
}

function readQueue(): LoginFailureTelemetry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.slice(-MAX_QUEUE_SIZE)
      : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: LoginFailureTelemetry[]) {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(QUEUE_KEY);
      return;
    }

    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(queue.slice(-MAX_QUEUE_SIZE))
    );
  } catch {
    // Telemetry must never interfere with login.
  }
}

function createEventId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getConnection() {
  const typedNavigator = navigator as NavigatorWithConnection;
  return typedNavigator.connection ??
    typedNavigator.mozConnection ??
    typedNavigator.webkitConnection;
}

function getTargetOrigin() {
  try {
    return new URL(
      api.defaults.baseURL ?? window.location.origin,
      window.location.origin
    ).origin;
  } catch {
    return window.location.origin;
  }
}

function getDiagnostic(error: unknown) {
  if (error instanceof ApiNetworkError) {
    return {
      reportable: true,
      code: error.code,
      name: error.name,
      message: error.originalMessage || error.message,
      httpStatus: null,
    };
  }

  if (axios.isAxiosError(error)) {
    const httpStatus = error.response?.status ?? null;

    return {
      reportable: httpStatus === null || httpStatus >= 500,
      code: error.code ?? "",
      name: error.name,
      message: error.message,
      httpStatus,
    };
  }

  if (error instanceof Error) {
    return {
      reportable: false,
      code: "",
      name: error.name,
      message: error.message,
      httpStatus: null,
    };
  }

  return {
    reportable: false,
    code: "",
    name: "",
    message: "",
    httpStatus: null,
  };
}

export async function flushLoginFailureTelemetry() {
  const queue = readQueue();

  while (queue.length > 0) {
    try {
      await api.post(
        "/api/client-telemetry/login-failure",
        queue[0],
        { timeout: 3000 }
      );
      queue.shift();
      writeQueue(queue);
    } catch {
      writeQueue(queue);
      return;
    }
  }
}

export async function reportLoginFailure(
  error: unknown,
  durationMs: number
) {
  const diagnostic = getDiagnostic(error);
  if (!diagnostic.reportable) {
    return;
  }

  const connection = getConnection();
  const payload: LoginFailureTelemetry = {
    clientEventId: createEventId(),
    occurredAt: new Date().toISOString(),
    errorCode: safeText(diagnostic.code, 64),
    errorName: safeText(diagnostic.name, 64),
    errorMessage: safeText(diagnostic.message, 180),
    httpStatus: diagnostic.httpStatus,
    online: navigator.onLine,
    durationMs: Math.max(
      0,
      Math.min(120000, Math.round(durationMs))
    ),
    targetOrigin: safeText(getTargetOrigin(), 256),
    visibilityState: safeText(document.visibilityState, 32),
    effectiveConnectionType: safeText(connection?.effectiveType, 32),
    rttMs: typeof connection?.rtt === "number"
      ? Math.max(0, Math.round(connection.rtt))
      : null,
    downlinkMbps: typeof connection?.downlink === "number"
      ? Math.max(0, connection.downlink)
      : null,
  };

  const queue = readQueue();
  queue.push(payload);
  writeQueue(queue);

  await flushLoginFailureTelemetry();
}
