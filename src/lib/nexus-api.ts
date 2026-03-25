const NEXUS_API_BASE = "https://frc.nexus/api/v1";

export type NexusMatch = {
  label?: string | null;
  status?: string | null;
  redTeams?: string[];
  blueTeams?: string[];
  replayOf?: string | null;
  times?: {
    estimatedQueueTime?: number;
    estimatedOnDeckTime?: number;
    estimatedOnFieldTime?: number;
    estimatedStartTime?: number;
    actualQueueTime?: number;
    actualOnDeckTime?: number;
    actualOnFieldTime?: number;
    actualStartTime?: number;
  };
};

export type NexusLiveEvent = {
  eventKey: string;
  dataAsOfTime: number;
  nowQueuing?: string | null;
  matches: NexusMatch[];
  announcements?: Array<{ id?: string; text?: string }>;
  partsRequests?: Array<{ id?: string; teamNumber?: string; text?: string }>;
};

function getNexusApiKey(): string | null {
  const key = process.env.NEXUS_API_KEY?.trim();
  return key ? key : null;
}

async function nexusGet<T>(path: string): Promise<T | null> {
  const key = getNexusApiKey();
  if (!key) return null;
  try {
    const res = await fetch(`${NEXUS_API_BASE}${path}`, {
      headers: { "Nexus-Api-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getNexusLiveEventStatus(eventKey: string): Promise<NexusLiveEvent | null> {
  return nexusGet<NexusLiveEvent>(`/event/${encodeURIComponent(eventKey)}`);
}

export async function getNexusPitAddresses(
  eventKey: string
): Promise<Record<string, string> | null> {
  return nexusGet<Record<string, string>>(`/event/${encodeURIComponent(eventKey)}/pits`);
}

export async function getNexusEvents(): Promise<Record<string, unknown> | null> {
  return nexusGet<Record<string, unknown>>("/events");
}

