import { NextRequest, NextResponse } from "next/server";
import { allowedScopes, getSequenceTemplate } from "@/lib/sequence-templates";

export async function GET(req: NextRequest) {
  const constructionType = (req.nextUrl.searchParams.get("constructionType") as "Condo" | "House") || "House";
  const scope = (req.nextUrl.searchParams.get("scope") as "BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild" | "NewConstruction") || "FullRemodel";

  const scopes = allowedScopes(constructionType);
  const safeScope = scopes.includes(scope) ? scope : scopes[0];
  const tasks = getSequenceTemplate(constructionType, safeScope);

  return NextResponse.json({
    constructionType,
    availableScopes: scopes,
    selectedScope: safeScope,
    tasks,
  });
}
