import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// DELETE /api/render-formats/[id] - Delete a render format
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if format exists
    const format = await prisma.renderFormat.findUnique({
      where: { id }
    });

    if (!format) {
      return NextResponse.json(
        { error: 'Format not found' },
        { status: 404 }
      );
    }

    // Delete the format
    await prisma.renderFormat.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting render format:', error);
    return NextResponse.json(
      { error: 'Failed to delete render format' },
      { status: 500 }
    );
  }
} 