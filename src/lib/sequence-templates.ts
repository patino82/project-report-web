export type ConstructionType = "Condo" | "House";
export type ScopeType = "BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild" | "NewConstruction";

export type SequenceTemplateTask = {
  taskId: string;
  taskName: string;
  durationDays: number;
  predecessors: string[];
  ownerCompany: string;
  requiresInspection: boolean;
  callNow: boolean;
  phase: string;
  trade: string;
};

const baseBath: SequenceTemplateTask[] = [
  { taskId: "B001", taskName: "Demo + Protection", durationDays: 1, predecessors: [], ownerCompany: "Demo Crew", requiresInspection: false, callNow: false, phase: "Interior", trade: "Demo" },
  { taskId: "B002", taskName: "Rough Plumbing", durationDays: 1, predecessors: ["B001"], ownerCompany: "United Plumbing", requiresInspection: false, callNow: false, phase: "Interior", trade: "Plumbing" },
  { taskId: "B003", taskName: "Rough Electrical", durationDays: 1, predecessors: ["B001"], ownerCompany: "Advanced Electric", requiresInspection: false, callNow: false, phase: "Interior", trade: "Electrical" },
  { taskId: "B004", taskName: "Rough Inspection", durationDays: 1, predecessors: ["B002", "B003"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Interior", trade: "Inspection" },
  { taskId: "B005", taskName: "Tile + Waterproof", durationDays: 2, predecessors: ["B004"], ownerCompany: "Tile Sub", requiresInspection: false, callNow: false, phase: "Interior", trade: "Tile" },
  { taskId: "B006", taskName: "Fixture Set + Punch", durationDays: 1, predecessors: ["B005"], ownerCompany: "United Plumbing", requiresInspection: false, callNow: true, phase: "Closeout", trade: "Plumbing" },
];

const basePartial: SequenceTemplateTask[] = [
  ...baseBath,
  { taskId: "P007", taskName: "Kitchen Demo + Layout", durationDays: 1, predecessors: ["B001"], ownerCompany: "Demo Crew", requiresInspection: false, callNow: false, phase: "Interior", trade: "Demo" },
  { taskId: "P008", taskName: "Cabinet Install", durationDays: 2, predecessors: ["P007"], ownerCompany: "Trim Carpenter", requiresInspection: false, callNow: false, phase: "Interior", trade: "Cabinetry" },
  { taskId: "P009", taskName: "Countertop Install", durationDays: 1, predecessors: ["P008"], ownerCompany: "Countertop Sub", requiresInspection: false, callNow: true, phase: "Interior", trade: "Countertops" },
];

const baseFull: SequenceTemplateTask[] = [
  { taskId: "F001", taskName: "Permits + Precon", durationDays: 2, predecessors: [], ownerCompany: "Superintendent", requiresInspection: false, callNow: true, phase: "Start", trade: "PM" },
  ...basePartial,
  { taskId: "F010", taskName: "Framing Corrections", durationDays: 1, predecessors: ["P009"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Interior", trade: "Framing" },
  { taskId: "F011", taskName: "Final MEP Inspections", durationDays: 1, predecessors: ["F010"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Closeout", trade: "Inspection" },
  { taskId: "F012", taskName: "Final Punch + CO", durationDays: 1, predecessors: ["F011"], ownerCompany: "Superintendent", requiresInspection: false, callNow: true, phase: "Closeout", trade: "PM" },
];

const houseNewConstruction: SequenceTemplateTask[] = [
  { taskId: "N001", taskName: "Site Prep + Silt Fence", durationDays: 1, predecessors: [], ownerCompany: "USA Siteworks", requiresInspection: false, callNow: false, phase: "Site", trade: "Sitework" },
  { taskId: "N002", taskName: "Demo / Clearing for Build", durationDays: 2, predecessors: ["N001"], ownerCompany: "Demo Crew", requiresInspection: false, callNow: false, phase: "Site", trade: "Demo" },
  { taskId: "N003", taskName: "Footers Excavation", durationDays: 1, predecessors: ["N002"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Concrete" },
  { taskId: "N004", taskName: "Compaction", durationDays: 1, predecessors: ["N003"], ownerCompany: "YPC", requiresInspection: false, callNow: true, phase: "Foundation", trade: "Sitework" },
  { taskId: "N005", taskName: "Footer Rebar", durationDays: 1, predecessors: ["N004"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Concrete" },
  { taskId: "N006", taskName: "Footer Inspection", durationDays: 1, predecessors: ["N005"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Foundation", trade: "Inspection" },
  { taskId: "N007", taskName: "Pour Footers", durationDays: 1, predecessors: ["N006"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Concrete" },
  { taskId: "N008", taskName: "Stem Wall", durationDays: 2, predecessors: ["N007"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Concrete" },
  { taskId: "N009", taskName: "Backfill", durationDays: 1, predecessors: ["N008"], ownerCompany: "USA Siteworks", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Sitework" },
  { taskId: "N010", taskName: "Underground Plumbing", durationDays: 1, predecessors: ["N009"], ownerCompany: "United Plumbing", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Plumbing" },
  { taskId: "N011", taskName: "Underground Electrical", durationDays: 1, predecessors: ["N009"], ownerCompany: "Advanced Electric", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Electrical" },
  { taskId: "N012", taskName: "Underground Gas", durationDays: 1, predecessors: ["N009"], ownerCompany: "VP Gas", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Gas" },
  { taskId: "N013", taskName: "Underground MEP Inspections", durationDays: 1, predecessors: ["N010", "N011", "N012"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Foundation", trade: "Inspection" },
  { taskId: "N014", taskName: "Framing", durationDays: 4, predecessors: ["N013"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Shell", trade: "Framing" },
  { taskId: "N015", taskName: "Roof Dry-In", durationDays: 2, predecessors: ["N014"], ownerCompany: "SBC", requiresInspection: false, callNow: true, phase: "Envelope", trade: "Roofing" },
  { taskId: "N016", taskName: "Rough Plumbing", durationDays: 2, predecessors: ["N015"], ownerCompany: "United Plumbing", requiresInspection: false, callNow: false, phase: "Interior", trade: "Plumbing" },
  { taskId: "N017", taskName: "Rough Electrical", durationDays: 2, predecessors: ["N015"], ownerCompany: "Advanced Electric", requiresInspection: false, callNow: false, phase: "Interior", trade: "Electrical" },
  { taskId: "N018", taskName: "Rough HVAC", durationDays: 2, predecessors: ["N015"], ownerCompany: "AC Professionals", requiresInspection: false, callNow: false, phase: "Interior", trade: "HVAC" },
  { taskId: "N019", taskName: "Fireplace Rough (if applicable)", durationDays: 1, predecessors: ["N015"], ownerCompany: "VP Gas", requiresInspection: false, callNow: false, phase: "Interior", trade: "Fireplace" },
  { taskId: "N020", taskName: "Lightning Protection", durationDays: 1, predecessors: ["N017"], ownerCompany: "Lightning Sub", requiresInspection: false, callNow: true, phase: "Exterior", trade: "Electrical" },
  { taskId: "N021", taskName: "Rough Inspections", durationDays: 1, predecessors: ["N016", "N017", "N018"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Interior", trade: "Inspection" },
  { taskId: "N022", taskName: "Hurricane Shutters", durationDays: 2, predecessors: ["N021"], ownerCompany: "Shutter Sub", requiresInspection: false, callNow: true, phase: "Exterior", trade: "Shutters" },
  { taskId: "N023", taskName: "Roll Down Screens", durationDays: 2, predecessors: ["N021"], ownerCompany: "Screen Sub", requiresInspection: false, callNow: true, phase: "Exterior", trade: "Screens" },
  { taskId: "N024", taskName: "Finals + CO", durationDays: 2, predecessors: ["N020", "N022", "N023"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Closeout", trade: "Inspection" },
];

const houseAddition: SequenceTemplateTask[] = [
  { taskId: "A001", taskName: "Existing Area Protection", durationDays: 1, predecessors: [], ownerCompany: "Superintendent", requiresInspection: false, callNow: false, phase: "Site", trade: "PM" },
  { taskId: "A002", taskName: "Demo for Addition Area", durationDays: 2, predecessors: ["A001"], ownerCompany: "Demo Crew", requiresInspection: false, callNow: false, phase: "Site", trade: "Demo" },
  { taskId: "A003", taskName: "Mini Split Relocation", durationDays: 1, predecessors: ["A002"], ownerCompany: "AC Professionals", requiresInspection: false, callNow: true, phase: "Site", trade: "HVAC" },
  { taskId: "A004", taskName: "Footers Excavation", durationDays: 1, predecessors: ["A003"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Concrete" },
  { taskId: "A005", taskName: "Compaction", durationDays: 1, predecessors: ["A004"], ownerCompany: "YPC", requiresInspection: false, callNow: true, phase: "Foundation", trade: "Sitework" },
  { taskId: "A006", taskName: "Footer Rebar + Inspection", durationDays: 2, predecessors: ["A005"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Foundation", trade: "Inspection" },
  { taskId: "A007", taskName: "Pour Footers + Stem Wall", durationDays: 3, predecessors: ["A006"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Foundation", trade: "Concrete" },
  { taskId: "A008", taskName: "Framing Tie-in", durationDays: 3, predecessors: ["A007"], ownerCompany: "SBC", requiresInspection: false, callNow: false, phase: "Shell", trade: "Framing" },
  { taskId: "A009", taskName: "Rough Plumbing + Electrical + Gas", durationDays: 2, predecessors: ["A008"], ownerCompany: "United Plumbing", requiresInspection: false, callNow: false, phase: "Interior", trade: "MEP" },
  { taskId: "A010", taskName: "Rough HVAC", durationDays: 2, predecessors: ["A008"], ownerCompany: "AC Professionals", requiresInspection: false, callNow: false, phase: "Interior", trade: "HVAC" },
  { taskId: "A011", taskName: "Lightning Protection", durationDays: 1, predecessors: ["A009"], ownerCompany: "Lightning Sub", requiresInspection: false, callNow: true, phase: "Exterior", trade: "Electrical" },
  { taskId: "A012", taskName: "Fireplace Rough (if applicable)", durationDays: 1, predecessors: ["A009"], ownerCompany: "VP Gas", requiresInspection: false, callNow: false, phase: "Interior", trade: "Fireplace" },
  { taskId: "A013", taskName: "MEP + Building Inspections", durationDays: 1, predecessors: ["A009", "A010"], ownerCompany: "Superintendent", requiresInspection: true, callNow: true, phase: "Interior", trade: "Inspection" },
  { taskId: "A014", taskName: "Hurricane Shutters", durationDays: 2, predecessors: ["A013"], ownerCompany: "Shutter Sub", requiresInspection: false, callNow: true, phase: "Exterior", trade: "Shutters" },
  { taskId: "A015", taskName: "Roll Down Screens", durationDays: 2, predecessors: ["A013"], ownerCompany: "Screen Sub", requiresInspection: false, callNow: true, phase: "Exterior", trade: "Screens" },
  { taskId: "A016", taskName: "Drywall + Finishes + Punch", durationDays: 3, predecessors: ["A013"], ownerCompany: "Drywall Sub", requiresInspection: false, callNow: false, phase: "Interior", trade: "Finishes" },
  { taskId: "A017", taskName: "Final Tie-in Punch", durationDays: 1, predecessors: ["A011", "A014", "A015", "A016"], ownerCompany: "Superintendent", requiresInspection: false, callNow: true, phase: "Closeout", trade: "PM" },
];

export function getSequenceTemplate(constructionType: ConstructionType, scope: ScopeType): SequenceTemplateTask[] {
  if (constructionType === "House" && (scope === "NewConstruction" || scope === "NewBuild")) return houseNewConstruction;
  if (constructionType === "House" && scope === "Addition") return houseAddition;
  if (scope === "FullRemodel") return baseFull;
  if (scope === "PartialRemodel") return basePartial;
  return baseBath;
}

export function allowedScopes(constructionType: ConstructionType): ScopeType[] {
  if (constructionType === "House") {
    return ["BathRemodel", "PartialRemodel", "FullRemodel", "Addition", "NewBuild"];
  }

  return ["BathRemodel", "PartialRemodel", "FullRemodel"];
}
