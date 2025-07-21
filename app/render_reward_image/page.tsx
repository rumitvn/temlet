"use client";

import React, { useState } from "react";
import { config } from "../../lib/config";

/**
 * Example "Create Jobs" page:
 * 1. User selects a .txt file with lines (each is a title).
 * 2. User enters a "Local Root Path" (like file:///C:/Users/...).
 * 3. User selects a folder of PNG images with `webkitdirectory`.
 * 4. We map each title line[i] to sortedImages[i].
 * 5. For each pair, we create a Nexrender job, building an absolute local path by
 *    combining the "Local Root Path" + webkitRelativePath of the image.
 * 6. We show the resulting table of Title, Image Path, Status, UID.
 */
export default function CreateJobPage() {
  // 1) Title lines
  const [titles, setTitles] = useState<string[]>([]);
  // 2) Folder images
  const [images, setImages] = useState<File[]>([]);

  // 3) Additional inputs: local root path, template, composition, output folder
  const [localRootPath, setLocalRootPath] = useState(
    config.getAssetFileUrl(config.getTopicPath("minimate", "animals"))
  );
  const [templateSrc, setTemplateSrc] = useState(
    "file:///C:/Users/youruser/Documents/AEProjects/49801406-boxing-day-sale-instagram-reel-AEdownload.com/Boxing Day Sale Instagram Reel/Boxing Day Sale Instagram Reel (converted)_level_1.aep"
  );
  const [composition, setComposition] = useState("Boxing Day Sale 03");
  const [outputFolder, setOutputFolder] = useState("D:/nexrender-output");

  // 4) Table results
  type JobResult = {
    title: string;
    imagePath: string;
    status: string; // e.g. "queued", "error", etc.
    uid: string | null;
  };
  const [jobResults, setJobResults] = useState<JobResult[]>([]);

  // 5) Loading / creation states
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [creatingAll, setCreatingAll] = useState(false);

  // --------------------------
  // HANDLERS
  // --------------------------

  // (A) Handle user picking a .txt file with lines
  const handleTitlesFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingTitles(true);

    try {
      const text = await file.text();
      // Split on new lines, filter out empty lines
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      setTitles(lines);
    } catch (err) {
      console.error(err);
      alert("Failed to read the .txt file");
    } finally {
      setLoadingTitles(false);
    }
  };

  // (B) Handle user picking a folder of images (via webkitdirectory).
  // We'll collect all .png files, sorted by name.
  const handleImagesFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    setLoadingImages(true);
    const arr = Array.from(fileList);

    // Filter for .png files only
    const pngs = arr.filter((f) => f.name.toLowerCase().endsWith(".png"));

    // Sort by filename (or by webkitRelativePath) to match titles order
    pngs.sort((a, b) => {
      return a.webkitRelativePath.localeCompare(b.webkitRelativePath);
    });

    setImages(pngs);
    setLoadingImages(false);
  };

  // (C) Create all jobs in sequence
  const handleCreateAllJobs = async () => {
    if (titles.length === 0 || images.length === 0) {
      alert("Please select a .txt with titles and a folder with images first.");
      return;
    }

    if (titles.length !== images.length) {
      alert(
        `Line count (${titles.length}) doesn't match image count (${images.length}).`
      );
      return;
    }

    setCreatingAll(true);
    setJobResults([]);

    const newResults: JobResult[] = [];

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      const imageFile = images[i];

      // Build the "absolute" file path by combining the user's localRootPath
      // with the file's webkitRelativePath.
      const imageAbsPath = combinePath(localRootPath, imageFile.webkitRelativePath);

      // Derive an output name
      const baseName = stripExtension(imageFile.name); // e.g. "bat"
      const outputFile = `${baseName}.mp4`;

      // Build request body
      const requestBody = {
        template: {
          src: templateSrc,
          composition,
        },
        assets: [
          {
            type: "data",
            layerName: "title",
            property: "Source Text",
            value: title,
          },
          {
            type: "image",
            layerName: "image",
            src: imageAbsPath,
          },
        ],
        actions: {
          postrender: [
            {
              module: "@nexrender/action-copy",
              output: `${outputFolder}/${outputFile}`,
              useJobId: "false",
            },
          ],
        },
      };

      // Initialize a row
      let row: JobResult = {
        title,
        imagePath: imageAbsPath,
        status: "creating",
        uid: null,
      };
      newResults.push(row);
      setJobResults([...newResults]); // re-render table progressively

      // POST the job
      try {
        const res = await fetch("http://localhost:3000/api/v1/jobs", {
          method: "POST",
          headers: {
            "nexrender-secret": "myapisecret",
            "content-type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          row.status = `error (${res.status})`;
          row.uid = "";
        } else {
          const result = await res.json();
          // Typically "state" = "queued" or "finished" or "error" from the server
          row.status = result.state || "queued";
          row.uid = result.uid;
        }
      } catch (err) {
        console.error(err);
        row.status = "error";
      }

      // Update table
      setJobResults([...newResults]);
    }

    setCreatingAll(false);
  };

  // --------------------------
  // HELPERS
  // --------------------------

  // Helper to remove file extension from a filename
  function stripExtension(filename: string) {
    const dotIndex = filename.lastIndexOf(".");
    if (dotIndex === -1) return filename;
    return filename.substring(0, dotIndex);
  }

  // Combine path bits: localRootPath + "/" + relative
  // e.g. "file:///C:/Users/username/Documents/someFolder" + "animals/bat.png"
  // -> "file:///C:/Users/username/Documents/someFolder/animals/bat.png"
  function combinePath(root: string, relative: string) {
    // remove trailing slash from root if any
    const trimmedRoot = root.replace(/\/+$/, "");
    // remove leading slash from relative if any
    const trimmedRel = relative.replace(/^\/+/, "");
    return `${trimmedRoot}/${trimmedRel}`;
  }

  // --------------------------
  // RENDER
  // --------------------------
  return (
    <div style={{ padding: "1rem" }}>
      <h1>Render Reward Image</h1>

      {/* Template Source + Composition */}
      <div style={styles.field}>
        <label style={styles.label}>Template Source (AEP path):</label>
        <input
          style={styles.input}
          type="text"
          value={templateSrc}
          onChange={(e) => setTemplateSrc(e.target.value)}
        />
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Composition:</label>
        <input
          style={styles.input}
          type="text"
          value={composition}
          onChange={(e) => setComposition(e.target.value)}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Output Folder (e.g. D:/nexrender-output):</label>
        <input
          style={styles.input}
          type="text"
          value={outputFolder}
          onChange={(e) => setOutputFolder(e.target.value)}
        />
      </div>

      {/* Local root path for images */}
      <div style={styles.field}>
        <label style={styles.label}>Local Root Path for Images:</label>
        <input
          style={styles.input}
          type="text"
          value={localRootPath}
          onChange={(e) => setLocalRootPath(e.target.value)}
        />
        <small style={{ color: "var(--foreground)", opacity: "0.7" }}>
          Example: <code>file:///C:/Users/youruser/Documents/minimate/animals</code>
        </small>
      </div>

      <hr style={{ margin: "1rem 0" }} />

      {/* Titles (.txt) */}
      <div style={styles.field}>
        <label style={styles.label}>Titles (.txt) file:</label>
        <input
          type="file"
          accept=".txt"
          onChange={handleTitlesFileChange}
          disabled={loadingTitles}
        />
        {loadingTitles && <p>Loading titles...</p>}
        {!!titles.length && (
          <p style={{ marginTop: "0.5rem" }}>
            Loaded {titles.length} lines from text file
          </p>
        )}
      </div>

      {/* Images folder (webkitdirectory) */}
      <div style={styles.field}>
        <label style={styles.label}>
          Images Folder (should contain .png files):
        </label>
        <input
          type="file"
          multiple
          webkitdirectory="true"
          onChange={handleImagesFolderChange}
          disabled={loadingImages}
        />
        {loadingImages && <p>Loading images...</p>}
        {!!images.length && (
          <p style={{ marginTop: "0.5rem" }}>
            Loaded {images.length} .png files from folder
          </p>
        )}
      </div>

      {/* Create All button */}
      <button
        onClick={handleCreateAllJobs}
        style={styles.button}
        disabled={creatingAll}
      >
        {creatingAll ? "Creating jobs..." : "Create All Jobs"}
      </button>

      {/* Results table */}
      {!!jobResults.length && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Created Jobs</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Image Path</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>UID</th>
              </tr>
            </thead>
            <tbody>
              {jobResults.map((r, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{r.title}</td>
                  <td style={styles.td}>{r.imagePath}</td>
                  <td style={styles.td}>{r.status}</td>
                  <td style={styles.td}>{r.uid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  field: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    marginBottom: "0.25rem",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "0.5rem",
    fontSize: "1rem",
    backgroundColor: "var(--background)", // match theme
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
    backgroundColor: "#007bff", // or a color variable if you prefer
    color: "#fff",
    fontWeight: 500,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    border: "1px solid var(--foreground)",
    padding: "8px",
    textAlign: "left" as const,
  },
  td: {
    border: "1px solid var(--foreground)",
    padding: "8px",
  },
};
