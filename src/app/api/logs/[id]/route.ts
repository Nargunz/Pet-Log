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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: idParam } = await params;
    const id = Number(idParam);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

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

    await pool.execute<ResultSetHeader>(
      "UPDATE logs SET pet_name = ?, task = ?, time = ?, updated_at = NOW() WHERE id = ?",
      [petName.trim(), task.trim(), parsedDate, id]
    );

    const [rows] = await pool.query<LogRow[]>(`${logSelect} WHERE id = ?`, [
      id,
    ]);

    if (!rows[0]) {
      return NextResponse.json({ message: "Log not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("[PUT /api/logs/[id]]", error);
    return NextResponse.json(
      { message: "Failed to update log" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const { id: idParam } = await params;
    const id = Number(idParam);

    if (!Number.isInteger(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const pool = getPool();
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM logs WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "Log not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/logs/[id]]", error);
    return NextResponse.json(
      { message: "Failed to delete log" },
      { status: 500 }
    );
  }
}

