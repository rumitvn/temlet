import { prisma } from "@/lib/prisma";

export async function generateMetadata(jsonContent: any) {
  try {
    // Get the base URL from environment variable or use a default
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    
    // Call the YouTube metadata API with full URL
    const response = await fetch(`${baseUrl}/api/youtube-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: jsonContent }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate metadata');
    }

    const metadata = await response.json();
    
    // Ensure we have title and description
    if (!metadata.title || !metadata.description) {
      throw new Error('Invalid metadata response: missing title or description');
    }

    // Return the metadata with default values for required fields
    return {
      ...metadata,
      categoryId: metadata.categoryId || "27",
      defaultLanguage: metadata.defaultLanguage || "vi",
      defaultAudioLanguage: metadata.defaultAudioLanguage || "vi",
      playlistId: metadata.playlistId || "",
      scheduleDate: metadata.scheduleDate || "",
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    throw error;
  }
} 