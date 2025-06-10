import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";

// GET /api/templates - List all templates
export async function GET() {
    try {
        const templates = await prisma.template.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Error listing templates:', error);
        return NextResponse.json(
            { error: 'Failed to list templates' },
            { status: 500 }
        );
    }
}

// POST /api/templates - Save a new template
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Save the file to the templates directory
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Create a unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const filepath = join(process.cwd(), 'public', 'templates', filename);
        
        // Ensure the templates directory exists
        await writeFile(filepath, buffer);

        // Save the template info to the database
        const template = await prisma.template.create({
            data: {
                name: file.name,
                path: `/templates/${filename}`,
                type: 'custom'
            }
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error('Error saving template:', error);
        return NextResponse.json(
            { error: 'Failed to save template' },
            { status: 500 }
        );
    }
}

// DELETE /api/templates/[id] - Delete a template
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = req.nextUrl.searchParams.get('id');
        if (!id) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            );
        }

        // Get template info before deleting
        const template = await prisma.template.findUnique({
            where: { id }
        });

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Delete the file
        const filepath = join(process.cwd(), 'public', template.path);
        await unlink(filepath);

        // Delete from database
        await prisma.template.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting template:', error);
        return NextResponse.json(
            { error: 'Failed to delete template' },
            { status: 500 }
        );
    }
} 