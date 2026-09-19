// import { NextResponse } from "next/server";
// import db from "@/lib/db.postgres";
// import type { allRow } from "@/lib/db.postgres";

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const date = searchParams.get("date");
//     let WherePart = "";
//     let queryParams: any[] = [];
//     if (date) {
//       queryParams.push(date);
//       WherePart = `WHERE purch_date >= $1::date
//       AND purch_date < $1::date + INTERVAL '1 day'`;
//     }
//     const { rows } = await db.query<allRow>(
//       `
//   SELECT
//        *
//       FROM "sheet_leads"
//       ${WherePart}
//       ORDER BY purch_date DESC
//       LIMIT 150
//       `,
//       queryParams,
//     );

//     return NextResponse.json(rows);
//   } catch (err) {
//     console.error("GET /api/cars/sheet/lead error", err);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }
// }
import { NextResponse } from "next/server";
import db from "@/lib/db.postgres";
import type { allRow } from "@/lib/db.postgres";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth/next";
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "LEADER" && session?.user?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const page = searchParams.get("page");
    const limit = searchParams.get("limit") || "50";
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await db.query<allRow>(
      `
        SELECT *
        FROM "sheet_leads"
      
        ORDER BY pick_date DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
    );
    const items = rows;
    const totalCountQuery = `
      SELECT COUNT(*)
      FROM "sheet_leads"
   
    `;
    const { rows: totalCountRows } = await db.query(totalCountQuery);
    const totalCount = totalCountRows[0].count;
    const hasMore = offset + Number(limit) < totalCount;
    return NextResponse.json({ items, totalCount, hasMore });
  } catch (err) {
    console.error("GET /api/cars/sheet/lead error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
