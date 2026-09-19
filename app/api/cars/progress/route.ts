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
    const month = searchParams.get("month"); // YYYY-MM

    if (!month) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }

    const startOfThisMonth = new Date(`${month}-01`);
    const endOfThisMonth = new Date(startOfThisMonth);
    endOfThisMonth.setMonth(startOfThisMonth.getMonth() + 1); // Move to the next month

    const startOfLastMonth = new Date(startOfThisMonth);
    startOfLastMonth.setMonth(startOfThisMonth.getMonth() - 1); // Subtract one month for the previous month
    const endOfLastMonth = new Date(startOfThisMonth);

    // Combined query for both cars sent and average time (in minutes)
    const query = `
      SELECT 
        sent_by AS "employeeName", 
        -- Current month cars sent
        COUNT(CASE WHEN created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day') THEN 1 END) AS "carsSentThisMonth",
        -- Last month cars sent
        COUNT(CASE WHEN created_at >= $3::date AND created_at < $4::date THEN 1 END) AS "carsSentLastMonth",
        
        -- Current month average time
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (sent_at - taken_at))) 
        AS "averageTimeInSecondsThisMonth",
        -- Last month average time
       PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (sent_at - taken_at))
    ) 
        FILTER (WHERE created_at >= $3::date AND created_at < $4::date) 
        AS "averageTimeInSecondsLastMonth"
      FROM "sheet_caller"
      WHERE sent_by IS NOT NULL
        AND taken_at IS NOT NULL
        AND sent_at IS NOT NULL
      GROUP BY sent_by
      ORDER BY "carsSentThisMonth" DESC
    `;

    const { rows } = await db.query(query, [
      startOfThisMonth,
      endOfThisMonth, // This month date range
      startOfLastMonth,
      endOfLastMonth, // Last month date range
    ]);

    // Return the data
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/cars/progress error", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
