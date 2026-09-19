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

    // First query: Average time for each employee
    const { rows: employeeRows } = await db.query(
      `
      SELECT 
        sent_by as "employeeName",
        
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (sent_at - taken_at))) AS "averageTimeInSeconds"
      FROM "sheet_caller"
      WHERE sent_by IS NOT NULL
        AND taken_at IS NOT NULL
        AND sent_at IS NOT NULL
        AND created_at >= $1::date
        AND created_at < ($2::date + INTERVAL '1 month')  
      GROUP BY sent_by
      ORDER BY "averageTimeInSeconds" ASC
      `,
      [new Date(`${month}-01`), new Date(`${month}`)],
    );

    // Second query: Average time by team_no
    const { rows: teamRows } = await db.query(
      `
      SELECT 
        team_no,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.sent_at - s.created_at))) AS "averageTimeInSeconds"
      FROM "sheet_caller" as s, "User" as u
      WHERE s.sent_by IS NOT NULL
        AND s.taken_at IS NOT NULL
        AND u.name = s.sent_by
        AND s.created_at >= $1::date
        AND s.created_at < ($2::date + INTERVAL '1 month')  
      GROUP BY team_no
      ORDER BY "averageTimeInSeconds" ASC
      `,
      [new Date(`${month}-01`), new Date(`${month}`)],
    );

    // Combine both results
    return NextResponse.json({
      employeeAverageTime: employeeRows,
      teamAverageTime: teamRows,
    });
  } catch (err) {
    console.error("GET /api/cars/averageTimeTaken error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
