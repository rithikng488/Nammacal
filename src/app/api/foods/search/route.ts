import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods } from "@/lib/nutrition/food-service";
import type { FoodCategory, FoodState, Food } from "@/lib/supabase/types";
import { z } from "zod";

const SearchQuerySchema = z.object({
  q: z.string().default(""),
  category: z.string().default("all"),
  state: z.string().default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Authenticated access only
    if (authError || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parseResult = SearchQuerySchema.safeParse({
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "all",
      state: searchParams.get("state") || "all",
      limit: searchParams.get("limit") || 20,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "INVALID_PARAMETERS", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { q, category, state, limit } = parseResult.data;

    // Fetch user's custom created foods if any (protected by RLS)
    let customFoods: Food[] = [];
    try {
      const { data } = await supabase
        .from("foods")
        .select("*")
        .eq("created_by", user.id);
      if (data) customFoods = data;
    } catch {
      // In initial setup before migration is executed in Supabase, fall back gracefully to verified seed dataset
    }

    const results = searchFoods(
      {
        query: q,
        category: category as FoodCategory | "all",
        state: state as FoodState | "all",
        limit,
      },
      customFoods
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      query: q,
      results: results.map((r) => ({
        food: r.food,
        matchedOn: r.matchedOn,
        score: Math.round(r.score * 100),
      })),
    });
  } catch (error) {
    console.error("Food search error:", error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
