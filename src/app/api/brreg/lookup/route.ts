import { NextRequest, NextResponse } from "next/server";

interface BrregResponse {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform?: {
    kode: string;
    beskrivelse: string;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgNumber = searchParams.get("orgNumber");

  if (!orgNumber) {
    return NextResponse.json(
      { error: "orgNumber parameter required" },
      { status: 400 }
    );
  }

  // Remove spaces/dashes for API call
  const cleanNumber = orgNumber.replace(/[\s\-]/g, "");

  if (!/^\d{9}$/.test(cleanNumber)) {
    return NextResponse.json(
      { found: false, error: "Invalid organization number format" },
      { status: 200 }
    );
  }

  try {
    const response = await fetch(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${cleanNumber}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { found: false, error: "Organization not found" },
        { status: 200 }
      );
    }

    const data: BrregResponse = await response.json();

    return NextResponse.json({
      found: true,
      name: data.navn,
      type: data.organisasjonsform?.beskrivelse || "Ukjent",
    });
  } catch (error) {
    console.error("BRREG lookup failed:", error);
    return NextResponse.json(
      { found: false, error: "Lookup failed" },
      { status: 200 }
    );
  }
}
