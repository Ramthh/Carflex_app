import { NextResponse } from "next/server";
import db from "@/lib/db.postgres";
import type { allRow } from "@/lib/db.postgres";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth/next";
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit") || "50";
    const offset = (Number(page) - 1) * Number(limit);
    const search = searchParams.get("search") || "";
    const isAttacking = searchParams.get("isAttacking") === "true";
    const callStatus = searchParams.get("callStatus") || "";
    const isFavorite = searchParams.get("isFavorite") === "true";
    const isTruck = searchParams.get("isTruck") === "true";
    let WherePart = "WHERE u.name=s.sent_by ";
    let queryParams: any[] = [];
    if (session.user.role === "CALLER") {
      WherePart += `AND s.sheet_id = '${id.toLowerCase()}' `;
    }
    if (search) {
      WherePart += ` AND (title ILIKE $1 OR ad_link ILIKE $1 OR source ILIKE $1 OR sent_by ILIKE $1 OR VIN ILIKE $1  OR notes ILIKE $1) `;
      queryParams.push(`%${search}%`);
    }
    if (isAttacking) {
      WherePart += ` AND s.status IN ('Steal', 'Good') `;
    }
    if (isFavorite) {
      WherePart += ` AND is_favorite = true `;
    }
    if (callStatus) {
      WherePart += ` AND s.call_status = '${callStatus}' `;
    }
    if (isTruck) {
      WherePart += ` AND s.is_truck = true `;
    }
    const { rows } = await db.query<allRow>(
      `
        SELECT s.*, u.team_no
        FROM "sheet_caller" s , "User" u
        ${WherePart}
        ORDER BY sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      queryParams,
    );
    const items = rows;
    const totalCountQuery = `
      SELECT COUNT(*)
      FROM "sheet_caller" s , "User" u
      ${WherePart}
    `;
    const { rows: totalCountRows } = await db.query(
      totalCountQuery,
      queryParams,
    );
    const totalCount = totalCountRows[0].count;
    const hasMore = offset + Number(limit) < totalCount;
    return NextResponse.json({ items, totalCount, hasMore });
  } catch (err) {
    console.error("GET /api/cars/sheet/caller/[id] error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const {
      title,
      odometer,
      ad_link,
      price,
      source,
      sent_by,
      est_value,
      is_truck,
    } = await req.json();
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (
      !title ||
      !odometer ||
      !ad_link ||
      !price ||
      !source ||
      !sent_by ||
      !id
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }
    const { rows } = await db.query(
      `
      INSERT INTO "sheet_caller" (title, odometer, ad_link, price, source, sheet_id, created_at,sent_by, est_value, is_truck)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
      RETURNING *
      `,
      [
        title,
        odometer,
        ad_link,
        price,
        source,
        id.toLowerCase(),
        sent_by,
        est_value,
        is_truck,
      ],
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error: any) {
    console.error("POST /api/cars/sheet/caller/[id] error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
