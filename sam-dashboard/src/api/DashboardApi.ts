import axios from "axios";
import type { DashboardDto } from "../types/Dashboard";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export async function getDashboard(): Promise<DashboardDto> {
  // Ambil list (array) dan pakai item pertama
  const res = await http.get<any>("/dashboard");
  const raw = Array.isArray(res.data) ? res.data[0] : res.data;

  if (!raw?.metrics) {
    // biar gampang debug
    console.error("Dashboard response:", res.data);
    throw new Error("Invalid dashboard shape: metrics missing");
  }

  return raw as DashboardDto;
}

export async function retryLogs(keys: string[]) {
  // opsi paling gampang: simulate sukses
  console.log("Retry requested:", keys);
  return { ok: true, retried: keys.length };
}
