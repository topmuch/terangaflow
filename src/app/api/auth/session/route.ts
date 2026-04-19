import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      );
    }
    return NextResponse.json({
      success: true,
      data: {
        id: (session.user as Record<string, unknown>).id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as Record<string, unknown>).role,
        tenantId: (session.user as Record<string, unknown>).tenantId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
