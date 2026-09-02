import axios from "axios";
import { TOKEN_KEY } from "./api";
import type {
  SharedAttendanceResult,
  SharedPosSession,
  SharedPosUnlockResponse,
} from "../types/attendance";

export const SHARED_DEVICE_TOKEN_KEY = "nf_shared_device_token";
export const SHARED_SESSION_TOKEN_KEY = "nf_shared_session_token";
export const SHARED_MODE_KEY = "nf_shared_mode";

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || undefined;

export const sharedPosApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export function getSharedDeviceToken() {
  return localStorage.getItem(SHARED_DEVICE_TOKEN_KEY) ?? "";
}

export function saveSharedDeviceToken(token: string) {
  localStorage.setItem(SHARED_DEVICE_TOKEN_KEY, token);
  localStorage.setItem(SHARED_MODE_KEY, "1");
}

export function clearSharedDevice() {
  localStorage.removeItem(SHARED_DEVICE_TOKEN_KEY);
  localStorage.removeItem(SHARED_MODE_KEY);
  clearSharedSession();
}

export function getSharedSessionToken() {
  return sessionStorage.getItem(SHARED_SESSION_TOKEN_KEY) ?? "";
}

export function saveSharedSession(token: string) {
  sessionStorage.setItem(SHARED_SESSION_TOKEN_KEY, token);
}

export function clearSharedSession() {
  sessionStorage.removeItem(SHARED_SESSION_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isSharedMode() {
  return localStorage.getItem(SHARED_MODE_KEY) === "1" &&
    Boolean(getSharedDeviceToken());
}

export function activateSharedPosUser(
  posToken: string,
  sessionToken: string
) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.setItem(TOKEN_KEY, posToken);
  saveSharedSession(sessionToken);
}

export async function unlockSharedPos(pin: string) {
  const deviceToken = getSharedDeviceToken();
  const { data } = await sharedPosApi.post<SharedPosUnlockResponse>(
    "/api/shared-pos/unlock",
    { pin },
    {
      headers: {
        "X-NF-Device-Token": deviceToken,
      },
    }
  );

  saveSharedSession(data.sessionToken);
  return data;
}

export async function getSharedPosSession() {
  const sessionToken = getSharedSessionToken();
  const { data } = await sharedPosApi.get<SharedPosSession>(
    "/api/shared-pos/session",
    {
      headers: {
        "X-NF-Session-Token": sessionToken,
      },
    }
  );

  return data;
}

export async function lockSharedPosSession() {
  const sessionToken = getSharedSessionToken();
  if (!sessionToken) {
    clearSharedSession();
    return;
  }

  try {
    await sharedPosApi.post(
      "/api/shared-pos/lock",
      null,
      {
        headers: {
          "X-NF-Session-Token": sessionToken,
        },
      }
    );
  } finally {
    clearSharedSession();
  }
}

export async function punchSharedAttendance(
  kind: "checkin" | "checkout"
) {
  const sessionToken = getSharedSessionToken();
  const { data } = await sharedPosApi.post<SharedAttendanceResult>(
    `/api/shared-pos/attendance/${kind}`,
    null,
    {
      headers: {
        "X-NF-Session-Token": sessionToken,
      },
    }
  );

  clearSharedSession();
  return data;
}
