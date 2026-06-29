import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { testWhatsAppConnection } from "@/lib/whatsapp";
import { importCustomersFromCsv } from "@/lib/actions";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const db = await getDb();
  const barber = await db.get<{
    name: string;
    shop_name: string | null;
    whatsapp_phone_id: string | null;
    whatsapp_verified: boolean | number;
    onboarding_completed: boolean | number;
  }>(
    `SELECT name, shop_name, whatsapp_phone_id, whatsapp_verified, onboarding_completed FROM barbers WHERE id = ?`,
    [auth.barberId]
  );

  return apiSuccess({
    step: barber?.onboarding_completed ? 4 : barber?.whatsapp_phone_id ? 3 : barber?.shop_name ? 2 : 1,
    barber,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { step } = body;
  const db = await getDb();

  if (step === 1) {
    const { name, shopName } = body;
    if (!name?.trim() || !shopName?.trim()) {
      return apiError("Nome e negozio richiesti", "VALIDATION_ERROR");
    }
    await db.run(
      `UPDATE barbers SET name = ?, shop_name = ? WHERE id = ?`,
      [name.trim(), shopName.trim(), auth.barberId]
    );
    return apiSuccess({ step: 2 });
  }

  if (step === 2) {
    const { phoneId, apiToken } = body;
    if (!phoneId || !apiToken) {
      return apiError("Phone ID e token richiesti", "VALIDATION_ERROR");
    }
    await db.run(
      `UPDATE barbers SET whatsapp_phone_id = ?, whatsapp_api_token = ? WHERE id = ?`,
      [phoneId, apiToken, auth.barberId]
    );
    const test = await testWhatsAppConnection(auth.barberId);
    if (!test.ok) {
      return apiError(test.error ?? "Test WhatsApp fallito", "WHATSAPP_TEST_FAILED", 422);
    }
    return apiSuccess({ step: 3, whatsapp: test });
  }

  if (step === 3) {
    const { customers, csv } = body;
    let imported = 0;

    if (csv) {
      const result = await importCustomersFromCsv(auth.barberId, csv);
      imported = result.imported;
    } else if (Array.isArray(customers)) {
      for (const c of customers) {
        if (c.name && c.phone) {
          const { actionCreateCustomer } = await import("@/lib/actions");
          await actionCreateCustomer(auth.barberId, {
            name: c.name,
            phone: c.phone,
            lastCutDate: c.lastCutDate,
          });
          imported++;
        }
      }
    }

    await db.run(
      `UPDATE barbers SET onboarding_completed = ? WHERE id = ?`,
      [1, auth.barberId]
    );

    return apiSuccess({ step: 4, imported, completed: true });
  }

  return apiError("Step non valido", "INVALID_STEP");
}
