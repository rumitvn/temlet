export type RenderStatus = 
    | 'new'
    | 'pending_render'
    | 'rendering'
    | 'rendered'
    | 'pending_metadata'
    | 'processing_metadata'
    | 'processed_metadata'
    | 'pending_upload'
    | 'processing_upload'
    | 'uploaded'
    | 'declined'
    | 'approved';

export type RenderType = 'short' | 'long';

export interface TemplateAeRenderFormat {
    id: string;
    name: string;
    code: string;
}

export interface TemplateAeAsset {
    type: 'data' | 'audio' | 'image' | 'video';
    layerName: string;
    property?: string;
    value?: string | number;
    src?: string;
}

export interface YouTubeMetadata {
    title: string;
    description: string;
    tags: string;
    categoryId: string;
    defaultLanguage: string;
    defaultAudioLanguage: string;
    scheduleDate: string;
}

export interface UploadConfig {
    scheduleStart: Date;
    fromHour: number;
    toHour: number;
    videosPerDay: number;
}

export interface RenderItem {
    id: string;
    fileName: string;
    nexrenderUid: string;
    type: RenderType;
    topic: string;
    channelName: string;
    channelId: string;
    templateAeUrl: string;
    templateAeComposition: string;
    templateAeRenderFormat: TemplateAeRenderFormat;
    templateAeAssets?: TemplateAeAsset[];
    autoRender: boolean;
    autoCreateMetadata: boolean;
    autoUpload: boolean;
    uploadScheduleStart: Date | null;
    uploadFromHour: number | null;
    uploadToHour: number | null;
    videosPerDay: number;
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
    type: RenderType;
    topic: string;
    channelName: string;
    channelId: string;
    templateAeUrl: string;
    templateAeComposition: string;
    templateAeRenderFormat: TemplateAeRenderFormat;
    templateAeAssets?: TemplateAeAsset[];
    autoRender: boolean;
    autoCreateMetadata: boolean;
    autoUpload: boolean;
    uploadScheduleStart?: Date;
    uploadFromHour?: number;
    uploadToHour?: number;
    videosPerDay?: number;
    jsonContent: any;
    mp4Link: string;
}

export interface UpdateRenderItemDto {
    type?: RenderType;
    topic?: string;
    channelName?: string;
    channelId?: string;
    templateAeUrl?: string;
    templateAeComposition?: string;
    templateAeRenderFormat?: TemplateAeRenderFormat;
    templateAeAssets?: TemplateAeAsset[];
    autoRender?: boolean;
    autoCreateMetadata?: boolean;
    autoUpload?: boolean;
    uploadScheduleStart?: Date;
    uploadFromHour?: number;
    uploadToHour?: number;
    videosPerDay?: number;
    youtubeMetadata?: YouTubeMetadata;
    status?: RenderStatus;
    renderTime?: number;
    metadataTime?: number;
    uploadTime?: number;
    youtubeLink?: string;
} 