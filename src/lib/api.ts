// ─────────────────────────────────────────────────────────────────────────────
// Smart Parking API client
//
// Connects the Spot-Insight GUI to the Smart Parking REST API.
// All endpoints, object shapes and command names mirror the server contract
// (package `ambient_invisible_intelligence`, base path `/ambient-invisible-intelligence`).
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8084/ambient-invisible-intelligence";
const SYSTEM_ID = import.meta.env.VITE_SYSTEM_ID ?? "2026b.Omer.Asayag";
const API_VERSION = import.meta.env.VITE_API_VERSION ?? "1.3";
const USER_EMAIL = import.meta.env.VITE_USER_EMAIL ?? "admin@demo.org";

export const apiConfig = { BASE_URL, SYSTEM_ID, API_VERSION, USER_EMAIL };

// ── Boundary types (match the server's JSON shapes) ──────────────────────────

export interface ObjectId {
  objectId: string;
  systemID: string;
}

export interface ObjectBoundary {
  id?: ObjectId;
  type: string;
  alias?: string;
  status?: string;
  active?: boolean;
  creationTimestamp?: string;
  location?: { lat: number; lng: number };
  objectDetails?: Record<string, unknown>;
}

export interface CommandBoundary {
  command: string;
  targetObject: { id: ObjectId };
  invokedBy: { userId: { email: string; systemID: string } };
  commandAttributes?: Record<string, unknown>;
}

// Domain object type constants (mirror server ObjectType)
export const ObjectType = {
  PARKING_LOT: "PARKING_LOT",
  PARKING_SECTION: "PARKING_SECTION",
  PARKING_SLOT: "PARKING_SLOT",
  VEHICLE: "VEHICLE",
} as const;

// Typed view over a PARKING_SLOT's objectDetails
export interface SlotDetails {
  parentLotId?: string;
  parentSectionId?: string;
  slotKind?: "REGULAR" | "HANDICAP";
  healthStatus?: "OK" | "FAULTY";
  lastHeartbeat?: number;
}

// ── Low-level fetch helpers ──────────────────────────────────────────────────

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "API-Version": API_VERSION,
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(`API ${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`);
  }
  // Some endpoints (PUT, DELETE) return no body
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Objects ──────────────────────────────────────────────────────────────────

export async function getAllObjects(): Promise<ObjectBoundary[]> {
  const res = await fetch(`${BASE_URL}/objects`, { headers: headers() });
  return handle<ObjectBoundary[]>(res);
}

export async function getObject(objectId: string): Promise<ObjectBoundary> {
  const res = await fetch(`${BASE_URL}/objects/${SYSTEM_ID}/${objectId}`, { headers: headers() });
  return handle<ObjectBoundary>(res);
}

// ── Commands ─────────────────────────────────────────────────────────────────

export async function invokeCommand(
  command: string,
  targetObjectId: string,
  commandAttributes: Record<string, unknown> = {},
): Promise<unknown[]> {
  const body: CommandBoundary = {
    command,
    targetObject: { id: { objectId: targetObjectId, systemID: SYSTEM_ID } },
    invokedBy: { userId: { email: USER_EMAIL, systemID: SYSTEM_ID } },
    commandAttributes,
  };
  const res = await fetch(`${BASE_URL}/commands`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  return handle<unknown[]>(res);
}

// ── Domain-specific convenience wrappers ─────────────────────────────────────

export interface LotAvailability {
  lotId: string;
  freeSlots: number;
  searchingDrivers: number;
  worthEntering: boolean;
}

export async function availabilityInLot(lotId: string, slotKindFilter?: string): Promise<LotAvailability> {
  const attrs = slotKindFilter ? { slotKindFilter } : {};
  const [result] = (await invokeCommand("availabilityInLot", lotId, attrs)) as LotAvailability[];
  return result;
}

export interface SectionAvailability {
  sectionId: string;
  freeSlots: number;
  totalSlots: number;
}

export async function availabilityInSection(sectionId: string): Promise<SectionAvailability> {
  const [result] = (await invokeCommand("availabilityInSection", sectionId, {})) as SectionAvailability[];
  return result;
}

export interface PredictionResult {
  lotId: string;
  targetTimestamp?: string | number;
  predictedFreeSlots: number;
  note?: string;
}

export async function predictAvailability(
  lotId: string,
  targetTimestamp: string,
): Promise<PredictionResult> {
  const [result] = (await invokeCommand("predictAvailability", lotId, { targetTimestamp })) as PredictionResult[];
  return result;
}

export async function updateSlotState(slotId: string, newState: "FREE" | "OCCUPIED"): Promise<void> {
  await invokeCommand("updateSlotState", slotId, { newState });
}

export interface BestSectionResult {
  lotId: string;
  bestSectionId: string | null;
  freeSlots: number;
  perSection: Record<string, number>;
}

export async function bestSectionInLot(lotId: string): Promise<BestSectionResult> {
  const [result] = (await invokeCommand("bestSectionInLot", lotId, {})) as BestSectionResult[];
  return result;
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

export interface UserBoundary {
  userId: { email: string; systemID: string };
  role: string;
  username?: string;
  avatar?: string;
}

export async function getAllUsers(): Promise<UserBoundary[]> {
  const res = await fetch(`${BASE_URL}/admin/users`, { headers: headers() });
  return handle<UserBoundary[]>(res);
}

export interface CommandHistoryItem {
  id?: { commandId: string; systemID: string };
  command: string;
  targetObject?: { id: ObjectId };
  invocationTimestamp?: string;
  invokedBy?: { userId: { email: string; systemID: string } };
  commandAttributes?: Record<string, unknown>;
}

export async function getAllCommands(): Promise<CommandHistoryItem[]> {
  const res = await fetch(`${BASE_URL}/admin/commands`, { headers: headers() });
  return handle<CommandHistoryItem[]>(res);
}

// Run a lot-level health check (UC-10). Returns any slots with non-OK health.
export interface FaultySlot {
  slotId: string;
  alias: string;
  healthStatus: string;
}

export async function runHealthCheck(lotId: string): Promise<FaultySlot[]> {
  return (await invokeCommand("runHealthCheck", lotId, {})) as FaultySlot[];
}
