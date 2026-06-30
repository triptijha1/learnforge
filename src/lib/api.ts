import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NoCreditsError, NotFoundError } from "@/lib/errors";

export function apiError(error: unknown, label: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", issues: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof NoCreditsError) {
    return NextResponse.json({ error: error.message }, { status: 402 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error(label, error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
