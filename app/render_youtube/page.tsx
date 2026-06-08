// app/render_youtube/page.tsx
"use client";

import React, { useState } from "react";
import { Button, Card, Badge } from "@/app/components/ui";

interface FilePair {
    jsonFile: File;
    mp4File: File;
    videoData: any;
    aiResult: { title: string; description: string; tags: string } | null;
    uploadResult: string | null;
    status: 'pending' | 'processing' | 'uploading' | 'completed' | 'error';
}

export default function RenderYouTubePage() {
    const [filePairs, setFilePairs] = useState<FilePair[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        const mp4Files = files.filter(f => f.name.endsWith('.mp4'));

        const newPairs: FilePair[] = [];

        jsonFiles.forEach(jsonFile => {
            const baseName = jsonFile.name.replace('.json', '');
            const matchingMp4 = mp4Files.find(mp4 => mp4.name === `${baseName}.mp4`);

            if (matchingMp4) {
                newPairs.push({
                    jsonFile,
                    mp4File: matchingMp4,
                    videoData: null,
                    aiResult: null,
                    uploadResult: null,
                    status: 'pending'
                });
            }
        });

        setFilePairs(prev => [...prev, ...newPairs]);

        // Load JSON data for new pairs
        newPairs.forEach(async (pair, index) => {
            const text = await pair.jsonFile.text();
            const videoData = JSON.parse(text);
            setFilePairs(prev => {
                const newPairs = [...prev];
                newPairs[prev.length - newPairs.length + index].videoData = videoData;
                return newPairs;
            });
        });
    };

    const handleGenerateMetadata = async (index: number) => {
        const pair = filePairs[index];
        if (!pair.videoData) return;

        setFilePairs(prev => {
            const newPairs = [...prev];
            newPairs[index].status = 'processing';
            return newPairs;
        });

        try {
            const res = await fetch("/api/youtube-metadata", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ json: pair.videoData })
            });
            const data = await res.json();
            
            setFilePairs(prev => {
                const newPairs = [...prev];
                newPairs[index].aiResult = data;
                newPairs[index].status = 'pending';
                return newPairs;
            });
        } catch (error) {
            setFilePairs(prev => {
                const newPairs = [...prev];
                newPairs[index].status = 'error';
                return newPairs;
            });
        }
    };

    const handleUpload = async (index: number) => {
        const pair = filePairs[index];
        if (!pair.aiResult) return;

        setFilePairs(prev => {
            const newPairs = [...prev];
            newPairs[index].status = 'uploading';
            return newPairs;
        });

        try {
            const form = new FormData();
            form.append("mp4", pair.mp4File);
            form.append("title", pair.aiResult.title);
            form.append("description", pair.aiResult.description);
            form.append("playlistId", "");
            form.append("tags", pair.aiResult.tags);
            form.append("categoryId", "27");
            form.append("defaultLanguage", "vi");
            form.append("defaultAudioLanguage", "vi");
            form.append("scheduleDate", "2025-06-08 08:00");

            const res = await fetch("/api/youtube-upload", {
                method: "POST",
                body: form
            });
            const data = await res.json();
            
            setFilePairs(prev => {
                const newPairs = [...prev];
                newPairs[index].uploadResult = data.videoId ? `Uploaded with ID: ${data.videoId}` : "Upload failed";
                newPairs[index].status = 'completed';
                return newPairs;
            });
        } catch (error) {
            setFilePairs(prev => {
                const newPairs = [...prev];
                newPairs[index].status = 'error';
                return newPairs;
            });
        }
    };

    const handleGenerateAllMetadata = async () => {
        setLoading(true);
        for (let i = 0; i < filePairs.length; i++) {
            await handleGenerateMetadata(i);
        }
        setLoading(false);
    };

    const handleUploadAll = async () => {
        setUploading(true);
        for (let i = 0; i < filePairs.length; i++) {
            if (filePairs[i].aiResult) {
                await handleUpload(i);
            }
        }
        setUploading(false);
    };

    return (
        <div className="p-5 max-w-3xl bg-bg text-text min-h-screen">
            <h1 className="text-2xl font-bold text-accent mb-5">🎬 Upload Multiple Quiz Videos</h1>

            <div className="mb-5 space-y-2">
                <label className="block text-sm font-medium text-text-muted">📄 Select JSON and MP4 Files:</label>
                <input
                    type="file"
                    accept=".json,.mp4"
                    onChange={handleFilesChange}
                    multiple
                    className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-accent-fg hover:file:bg-accent-hover"
                />
            </div>

            {filePairs.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-3">
                    <Button
                        variant="primary"
                        onClick={handleGenerateAllMetadata}
                        loading={loading}
                        disabled={loading}
                    >
                        {loading ? "Generating All..." : "Generate All Metadata"}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleUploadAll}
                        loading={uploading}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading All..." : "Upload All to YouTube"}
                    </Button>
                </div>
            )}

            {filePairs.map((pair, index) => (
                <Card key={index} className="p-5 mb-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">File Pair {index + 1}</h3>
                        <Badge status={pair.status}>{pair.status}</Badge>
                    </div>
                    <p className="text-text-muted">JSON: {pair.jsonFile.name}</p>
                    <p className="text-text-muted">MP4: {pair.mp4File.name}</p>

                    {pair.videoData && !pair.aiResult && (
                        <Button
                            variant="primary"
                            onClick={() => handleGenerateMetadata(index)}
                            loading={pair.status === 'processing'}
                            disabled={pair.status === 'processing'}
                        >
                            {pair.status === 'processing' ? "Generating..." : "Generate Metadata"}
                        </Button>
                    )}

                    {pair.aiResult && (
                        <div className="space-y-2">
                            <h4 className="font-semibold">📝 AI Result:</h4>
                            <p><strong>Title:</strong> {pair.aiResult.title}</p>
                            <p><strong>Description:</strong><br />{pair.aiResult.description}</p>
                            <p><strong>Tags:</strong><br />{pair.aiResult.tags}</p>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={() => handleGenerateMetadata(index)}
                                >
                                    🔁 Retry
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => handleUpload(index)}
                                    loading={pair.status === 'uploading'}
                                    disabled={pair.status === 'uploading'}
                                >
                                    📤 Upload to YouTube
                                </Button>
                            </div>
                        </div>
                    )}

                    {pair.uploadResult && (
                        <p className="text-success">{pair.uploadResult}</p>
                    )}
                </Card>
            ))}
        </div>
    );
}

