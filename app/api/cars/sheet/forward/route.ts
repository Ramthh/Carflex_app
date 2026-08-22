import { NextResponse } from "next/server";
import db from "@/lib/db.postgres";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await db.query(
      `
      INSERT INTO "sheet_leads" (
      
       pick_date,
       title,
       vin,
        reg_name,
        seller_name,
        pick_location,
        price,
        payment_method,
        lien,
        lien_amount,
        lien_bank,
        accidents,
        claim,
        damage,
        damage_condition,
        damage_location,
        seller_phone,
        street_address,
        city,
        province,
        postal_code,
      updated_at, 
      ad_link
        
         )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      `,
      [
        body.pickDate,
        body.title,
        body.vin,
        body.regName,
        body.sellerName,
        body.pickLocation,
        body.price,
        body.paymentMethod,
        body.lien,
        body.lienAmount,
        body.lienBank,
        body.accidents,
        body.claims,
        body.damage,
        body.damageCondition,
        body.damageLocation,
        body.sellerPhone,
        body.streetAddress,
        body.city,
        body.province,
        body.postalCode,
        new Date(),
        body.adLink,
      ],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SEND error:", err);
    return NextResponse.json({ error: "Failed to send data" }, { status: 500 });
  }
}
