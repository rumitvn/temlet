import { NextResponse } from "next/server";

/**
 * Standard JSON error response used across API route handlers.
 * Matches the existing `{ error: string }` contract consumed by the frontend.
 */
export function apiError(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginationDefaults {
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Parse the common page/limit/sortBy/sortOrder query params with sensible,
 * per-route overridable defaults.
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: PaginationDefaults = {},
): PaginationParams {
  const { limit = 10, sortBy = "createdAt", sortOrder = "desc" } = defaults;
  return {
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || String(limit)),
    sortBy: searchParams.get("sortBy") || sortBy,
    sortOrder: (searchParams.get("sortOrder") || sortOrder) as "asc" | "desc",
  };
}
