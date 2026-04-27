import axios from "axios";

export interface DailyPhotoRow    { tgl: string; totalPhotos: number }
export interface DailyStoreRow    { tgl: string; totalStores: number }
export interface DailyChannelRow  { tgl: string; channel: string; totalStores: number }
export interface DailyDisplayRow  { tgl: string; poi: string; totalPhotos: number; totalStores: number }
export interface DailyTeamRow { tgl: string; team: string; totalStores: number; totalPhotos: number }

export interface ChillerDaily {
  photosPerDay:  DailyPhotoRow[];
  storesPerDay:  DailyStoreRow[];
  channelPerDay: DailyChannelRow[];
  displayPerDay: DailyDisplayRow[];
  teamPerDay:    DailyTeamRow[];
}

const BASE_URL = import.meta.env.VITE_CHILLER_API_URL as string | undefined;
if (!BASE_URL) console.warn("[ChillerApi] VITE_CHILLER_API_URL is not set.");

const http = axios.create({ baseURL: BASE_URL ?? "https://posting-improve-skyward.ngrok-free.dev" });

export async function getChillerDaily(start: string, end: string): Promise<ChillerDaily> {
  const res = await http.get<ChillerDaily>("/chiller/daily", { params: { start, end } });
  return res.data;
}