import { NextResponse } from "next/server";
import db from "@/lib/db.postgres";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth/next";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }
    const { rows: sentCars } = await db.query(
      `
        SELECT 
          sent_by AS "employeeName", 
          COUNT(*) AS "carsSentCount",
          SUM(CASE WHEN status IN ('Steal', 'Good') THEN 1 ELSE 0 END) AS "carsAttackCount",
          (SELECT COUNT(*) FROM "sheet_caller" WHERE status IN ('Steal', 'Good') AND sent_by IS NOT NULL AND created_at >= $1::date
          AND created_at < ($2::date + INTERVAL '1 month')  ) AS  "totalAttacks", 
          (SELECT COUNT(*) FROM "sheet_caller" WHERE sent_by IS NOT NULL AND created_at >= $1::date
          AND created_at < ($2::date + INTERVAL '1 month')  ) AS "totalCars"
          
        FROM "sheet_caller"
        WHERE sent_by IS NOT NULL AND created_at >= $1::date
          AND created_at < ($2::date + INTERVAL '1 month')  
        GROUP BY sent_by
        order by "carsSentCount" DESC
      `,
      [new Date(`${month}-01`), new Date(`${month}`)],
    );
    const { rows: adCars } = await db.query(
      `
        SELECT 
          COUNT(*) AS "carsadded"
        FROM "all"
        WHERE created_at >= $1::date
          AND created_at < ($2::date + INTERVAL '1 month')  
       
        
      `,
      [new Date(`${month}-01`), new Date(`${month}`)],
    );
    const { rows: seenCars } = await db.query(
      `
        SELECT 
          COUNT(*) AS "carsSeen"
        FROM "all"
        WHERE created_at >= $1::date
          AND created_at < ($2::date + INTERVAL '1 month')  AND is_taken = true
       
        
      `,
      [new Date(`${month}-01`), new Date(`${month}`)],
    );
    return NextResponse.json({ sentCars, adCars, seenCars });
  } catch (err) {
    console.error("GET /api/cars/countCarsSent error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
