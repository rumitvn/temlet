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

// POST /api/templates - Create a new template (either upload file or save path)
export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get("content-type") || "";

        // Handle file upload
        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return NextResponse.json(
                    { error: 'No file provided' },
                    { status: 400 }
                );
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Save to templates directory
            const path = join(process.cwd(), 'public', 'templates', file.name);
            await writeFile(path, buffer);

            // Save to database
            const template = await prisma.template.create({
                data: {
                    name: file.name,
                    path: `/templates/${file.name}`,
                    type: 'custom'
                }
            });

            return NextResponse.json(template);
        }
        // Handle path saving
        else if (contentType.includes("application/json")) {
            const body = await req.json();
            const { path } = body;

            if (!path) {
                return NextResponse.json(
                    { error: 'No path provided' },
                    { status: 400 }
                );
            }

            // Save to database
            const template = await prisma.template.create({
                data: {
                    name: path.split('/').pop() || path.split('\\').pop() || 'template',
                    path,
                    type: 'custom'
                }
            });

            return NextResponse.json(template);
        }
        else {
            return NextResponse.json(
                { error: 'Invalid content type' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error saving template:', error);
        return NextResponse.json(
            { error: 'Failed to save template' },
            { status: 500 }
        );
    }
}

// DELETE /api/templates?id=<id> - Delete a template
export async function DELETE(req: NextRequest) {
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