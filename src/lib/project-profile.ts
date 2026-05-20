export type StructureType = "House" | "Condo";
export type ScopeType =
  | "BathRemodel"
  | "PartialRemodel"
  | "FullRemodel"
  | "Addition"
  | "NewBuild";

export function normalizeProjectProfile(structureType: StructureType, scopeType: ScopeType): {
  structureType: StructureType;
  scopeType: ScopeType;
} {
  if (structureType === "Condo" && (scopeType === "Addition" || scopeType === "NewBuild")) {
    return { structureType, scopeType: "FullRemodel" };
  }

  return { structureType, scopeType };
}

export function parseOptionalDateInput(value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return date;
}
