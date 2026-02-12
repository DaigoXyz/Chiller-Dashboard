import axios from "axios";
import type { ErrorLogItemDto } from "../types/Dashboard";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

type DashboardDtoLike = {
  errorLogs?: ErrorLogItemDto[];
};

export async function getErrorLogs(): Promise<ErrorLogItemDto[]> {
  // Ambil dari list dashboard (array), pakai item pertama
  const res = await http.get<DashboardDtoLike[]>("/dashboard");
  const first = res.data?.[0];
  return first?.errorLogs ?? [];
}

export async function retryLogs(logKeys: string[]): Promise<void> {
  // MockAPI gak punya action endpoint custom → simulate
  console.log("Retrying logs:", logKeys);
}