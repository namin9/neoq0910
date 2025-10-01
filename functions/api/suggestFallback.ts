import trainStations from "../../data/train_stations.json";
import busTerminals from "../../data/bus_terminals.json";
import type { SuggestItem } from "./suggest";

type TrainStation = {
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
  lines?: string[];
  code?: string;
};

type BusTerminal = {
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
  routes?: string[];
  code?: string;
};

type FallbackEntry = {
  item: SuggestItem;
  tokens: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/["'`]/g, "");

const tokenise = (value: string | undefined) => {
  if (!value) return [] as string[];
  return [value]
    .flatMap((part) => part.split(/[\s,()/]+/g))
    .map((part) => normalize(part))
    .filter(Boolean);
};

const stationEntries: FallbackEntry[] = (trainStations as TrainStation[]).map((station) => {
  const subtitle = [station.city, station.lines?.join(", ")]
    .filter(Boolean)
    .join(" • ");

  const item: SuggestItem = {
    type: "place",
    title: station.name,
    subtitle,
    x: station.longitude,
    y: station.latitude,
  };

  const tokens = [
    normalize(station.name),
    ...tokenise(station.city),
    ...tokenise(station.lines?.join(" ")),
    ...tokenise(station.code),
  ];

  return { item, tokens };
});

const terminalEntries: FallbackEntry[] = (busTerminals as BusTerminal[]).map((terminal) => {
  const subtitle = [terminal.city, terminal.routes?.join(", ")]
    .filter(Boolean)
    .join(" • ");

  const item: SuggestItem = {
    type: "place",
    title: terminal.name,
    subtitle,
    x: terminal.longitude,
    y: terminal.latitude,
  };

  const tokens = [
    normalize(terminal.name),
    ...tokenise(terminal.city),
    ...tokenise(terminal.routes?.join(" ")),
    ...tokenise(terminal.code),
  ];

  return { item, tokens };
});

const FALLBACK_ENTRIES: FallbackEntry[] = [...stationEntries, ...terminalEntries];

export function suggestFromFallback(query: string, limit: number): SuggestItem[] {
  const keyword = normalize(query || "");
  if (!keyword) return [];

  const matches: SuggestItem[] = [];
  for (const entry of FALLBACK_ENTRIES) {
    if (entry.tokens.some((token) => token.includes(keyword) || keyword.includes(token))) {
      matches.push(entry.item);
    }
    if (matches.length >= limit) break;
  }

  return matches;
}
