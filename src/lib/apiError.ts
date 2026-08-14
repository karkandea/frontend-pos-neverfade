import axios from "axios";

type ApiError = {
  code?: string;
  message?: string;
  title?: string;
};

export function getApiError(error: unknown) {
  if (axios.isAxiosError<ApiError>(error)) {
    return {
      code: error.response?.data?.code ?? "",
      message:
        error.response?.data?.message ??
        error.response?.data?.title ??
        error.message,
    };
  }

  return {
    code: "",
    message: error instanceof Error
      ? error.message
      : "Terjadi kesalahan. Coba lagi.",
  };
}
