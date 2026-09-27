import type { Driver } from "./types";

export function fileSafe(name: string) {
  return name.replace(/[/\\:*?"<>|]+/g, "-");
}

export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit ? value.toFixed(1) : value} ${units[unit]}`;
}

/** What a backup never includes, whatever the dumper manages to write. */
export function backupLimits(driver: Driver) {
  if (driver === "mysql") {
    return "Events aren't backed up. Restoring leaves the existing events in place.";
  }
  if (driver === "postgres") {
    return "Grants, owners of individual objects, row-level security policies, custom collations and operators, and extended statistics aren't backed up.";
  }
  return "";
}
