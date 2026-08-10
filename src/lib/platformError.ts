import axios from "axios";

import type { PlatformApiError } from "../types/platform";

export function getPlatformErrorMessage(error: unknown) {
  if (axios.isAxiosError<PlatformApiError>(error)) {
    const code = error.response?.data?.code;
    const message = error.response?.data?.message;

    if (message && code) {
      return `${message} (${code})`;
    }

    if (message) {
      return message;
    }
  }

  return error instanceof Error
    ? error.message
    : "Terjadi kesalahan. Coba lagi.";
}
