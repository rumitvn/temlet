// app/render_youtube/page.tsx
"use client";

import React, { useState } from "react";

export default function RenderYouTubePage() {
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [mp4File, setMp4File] = useState<File | null>(null);
    const [videoData, setVideoData] = useState<any>(null);
    const [aiResult, setAiResult] = useState<{ title: string; description: string; tags: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<string | null>(null);

    const handleJsonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setJsonFile(file);
        file.text().then((text) => setVideoData(JSON.parse(text)));
    };

    const handleMp4Change = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setMp4File(file);
    };

    const handleGenerateMetadata = async () => {
        if (!videoData) return;
        setLoading(true);
        setAiResult(null);
        const res = await fetch("/api/youtube-metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ json: videoData })
        });
        const data = await res.json();
        setAiResult(data);
        setLoading(false);
    };

    const handleUpload = async () => {
        if (!aiResult || !mp4File) return;
        setUploading(true);
        const form = new FormData();
        form.append("mp4", mp4File);
        form.append("title", aiResult.title);
        form.append("description", aiResult.description);
        form.append("playlistId", "");
        form.append("tags", aiResult.tags);
        form.append("categoryId", "27");
        form.append("defaultLanguage", "vi");
        form.append("defaultAudioLanguage", "vi");
        form.append("scheduleDate", "2025-06-08 08:00");

        const res = await fetch("/api/youtube-upload", {
            method: "POST",
            body: form
        });
        const data = await res.json();
        setUploadResult(data.videoId ? `Uploaded with ID: ${data.videoId}` : "Upload failed");
        setUploading(false);
    };

    return (
        <div style={{ padding: 20, maxWidth: 600 }}>
            <h1>🎬 Upload One Quiz Video</h1>

            <div style={{ marginBottom: 20 }}>
                <label>📄 JSON File:</label>
                <input type="file" accept=".json" onChange={handleJsonChange} />
            </div>

            <div style={{ marginBottom: 20 }}>
                <label>🎥 MP4 File:</label>
                <input type="file" accept=".mp4" onChange={handleMp4Change} />
            </div>

            <button style={styles.button} onClick={handleGenerateMetadata} disabled={!jsonFile || loading}>
                {loading ? "Generating..." : "Generate Title & Description & Tags"}
            </button>

            {aiResult && (
                <div style={{ marginTop: 20 }}>
                    <h3>📝 AI Result:</h3>
                    <p><strong>Title:</strong> {aiResult.title}</p>
                    <p><strong>Description:</strong><br />{aiResult.description}</p>
                    <p><strong>Tag:</strong><br />{aiResult.tags}</p>
                    <button onClick={handleGenerateMetadata} style={{ marginRight: 10 }}>🔁 Retry</button>
                    <button style={styles.button} onClick={handleUpload} disabled={uploading}>📤 Upload to YouTube</button>
                </div>
            )}

            {uploadResult && <p style={{ marginTop: 20, color: 'green' }}>{uploadResult}</p>}
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
    },
    table: {
        width: "100%",
        borderCollapse: "collapse" as const,
    },
    th: {
        border: "1px solid #fff",
        padding: "8px",
        backgroundColor: "#222",
        color: "#fff",
        textAlign: "left" as const,
    },
    td: {
        border: "1px solid #ccc",
        padding: "8px",
    },
};

