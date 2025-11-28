import { getPool } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

type LogRow = RowDataPacket & {
  id: number;
  petName: string;
  task: string;
  time: string;
  createdAt: string;
  updatedAt: string;
};

const logSelect =
  "SELECT id, pet_name AS petName, task, time, created_at AS createdAt, updated_at AS updatedAt FROM logs";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const pool = getPool();
    const [rows] = await pool.query<LogRow[]>(`${logSelect} ORDER BY time DESC`);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[GET /api/logs]", error);
    return NextResponse.json(
      { message: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { petName, task, time } = body;

    if (!petName || !task || !time) {
      return NextResponse.json(
        { message: "petName, task, and time are required" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(time);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid time format" },
        { status: 400 }
      );
    }

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO logs (pet_name, task, time, updated_at) VALUES (?, ?, ?, NOW())",
      [petName.trim(), task.trim(), parsedDate]
    );

    const [rows] = await pool.query<LogRow[]>(
      `${logSelect} WHERE id = ?`,
      [result.insertId]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("[POST /api/logs]", error);
    return NextResponse.json(
      { message: "Failed to create log" },
      { status: 500 }
    );
  }
}

