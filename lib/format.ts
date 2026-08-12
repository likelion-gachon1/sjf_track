export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });
}
