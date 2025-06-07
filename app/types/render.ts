export type RenderStatus = 
    | 'new'
    | 'processing_metadata'
    | 'processed_metadata'
    | 'processing_upload'
    | 'uploaded'
    | 'declined'
    | 'approved';

export interface YouTubeMetadata {
    title: string;
    description: string;
    tags: string;
    categoryId: string;
    defaultLanguage: string;
    defaultAudioLanguage: string;
    scheduleDate: string;
}

export interface RenderItem {
    id: string;
    fileName: string;
    nexrenderUid: string;
    jsonContent: any;
    mp4Link: string;
    youtubeMetadata: YouTubeMetadata | null;
    status: RenderStatus;
    renderTime: number | null; // in seconds
    metadataTime: number | null; // in seconds
    uploadTime: number | null; // in seconds
    youtubeLink: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateRenderItemDto {
    fileName: string;
    nexrenderUid: string;
    jsonContent: any;
    mp4Link: string;
}

export interface UpdateRenderItemDto {
    youtubeMetadata?: YouTubeMetadata;
    status?: RenderStatus;
    renderTime?: number;
    metadataTime?: number;
    uploadTime?: number;
    youtubeLink?: string;
} 