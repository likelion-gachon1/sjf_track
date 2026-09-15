import { COPY } from "@/config/portal.config";
import { ApiError, TimeoutError } from "@/lib/api";

export function describeUploadError(err: unknown): string {
  if (err instanceof TimeoutError) return COPY.uploadTimeout;
  if (err instanceof ApiError) {
    return err.status === 413 ? COPY.uploadTooLarge : COPY.uploadServerError;
  }
  return COPY.uploadOffline;
}
