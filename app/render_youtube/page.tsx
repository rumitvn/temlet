// app/render_youtube/page.tsx
"use client";

import React, { useState } from "react";

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
        <div style={{ padding: 20, maxWidth: 800 }}>
            <h1>🎬 Upload Multiple Quiz Videos</h1>

            <div style={{ marginBottom: 20 }}>
                <label>📄 Select JSON and MP4 Files:</label>
                <input 
                    type="file" 
                    accept=".json,.mp4" 
                    onChange={handleFilesChange}
                    multiple 
                />
            </div>

            {filePairs.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <button 
                        style={styles.button} 
                        onClick={handleGenerateAllMetadata} 
                        disabled={loading}
                    >
                        {loading ? "Generating All..." : "Generate All Metadata"}
                    </button>
                    <button 
                        style={styles.button} 
                        onClick={handleUploadAll} 
                        disabled={uploading}
                    >
                        {uploading ? "Uploading All..." : "Upload All to YouTube"}
                    </button>
                </div>
            )}

            {filePairs.map((pair, index) => (
                <div key={index} style={styles.filePair}>
                    <h3>File Pair {index + 1}</h3>
                    <p>JSON: {pair.jsonFile.name}</p>
                    <p>MP4: {pair.mp4File.name}</p>
                    <p>Status: {pair.status}</p>

                    {pair.videoData && !pair.aiResult && (
                        <button 
                            style={styles.button} 
                            onClick={() => handleGenerateMetadata(index)} 
                            disabled={pair.status === 'processing'}
                        >
                            {pair.status === 'processing' ? "Generating..." : "Generate Metadata"}
                        </button>
                    )}

                    {pair.aiResult && (
                        <div>
                            <h4>📝 AI Result:</h4>
                            <p><strong>Title:</strong> {pair.aiResult.title}</p>
                            <p><strong>Description:</strong><br />{pair.aiResult.description}</p>
                            <p><strong>Tags:</strong><br />{pair.aiResult.tags}</p>
                            <button 
                                onClick={() => handleGenerateMetadata(index)} 
                                style={{ marginRight: 10 }}
                            >
                                🔁 Retry
                            </button>
                            <button 
                                style={styles.button} 
                                onClick={() => handleUpload(index)} 
                                disabled={pair.status === 'uploading'}
                            >
                                📤 Upload to YouTube
                            </button>
                        </div>
                    )}

                    {pair.uploadResult && (
                        <p style={{ color: 'green' }}>{pair.uploadResult}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

// Inline styles
const styles = {
    field: {
        marginBottom: "1rem",
    },
    label: {
        display: "block",
        marginBottom: "0.25rem",
        fontWeight: "bold" as const,
    },
    input: {
        width: "100%",
        padding: "0.5rem",
        fontSize: "1rem",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        border: "1px solid var(--foreground)",
        borderRadius: "4px",
    },
    button: {
        padding: "0.75rem 1.5rem",
        fontSize: "1rem",
        border: "none",
        cursor: "pointer" as const,
        borderRadius: "4px",
        backgroundColor: "#007bff",
        color: "#fff",
        fontWeight: 500,
        marginRight: "10px",
    },
    filePair: {
        border: "1px solid #ccc",
        padding: "20px",
        marginBottom: "20px",
        borderRadius: "4px",
    },
};

