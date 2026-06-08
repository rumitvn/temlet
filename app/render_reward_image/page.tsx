"use client";

import React, { useState } from "react";
import { NEXRENDER_BASE_URL } from "@/app/lib/constants";
import { config } from "../../lib/config";
import { logger } from "@/app/lib/logger";
import {
  Button,
  Card,
  Input,
  Label,
  Badge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/app/components/ui";

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
      logger.error(err);
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
        const res = await fetch(`${NEXRENDER_BASE_URL}/api/v1/jobs`, {
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
        logger.error(err);
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
    <div className="p-4 bg-bg text-text min-h-screen">
      <h1 className="text-2xl font-bold text-accent mb-4">Render Reward Image</h1>

      <Card className="p-4 space-y-4">
        {/* Template Source + Composition */}
        <div className="space-y-1">
          <Label htmlFor="templateSrc">Template Source (AEP path):</Label>
          <Input
            id="templateSrc"
            type="text"
            value={templateSrc}
            onChange={(e) => setTemplateSrc(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="composition">Composition:</Label>
          <Input
            id="composition"
            type="text"
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="outputFolder">
            Output Folder (e.g. D:/nexrender-output):
          </Label>
          <Input
            id="outputFolder"
            type="text"
            value={outputFolder}
            onChange={(e) => setOutputFolder(e.target.value)}
          />
        </div>

        {/* Local root path for images */}
        <div className="space-y-1">
          <Label htmlFor="localRootPath">Local Root Path for Images:</Label>
          <Input
            id="localRootPath"
            type="text"
            value={localRootPath}
            onChange={(e) => setLocalRootPath(e.target.value)}
          />
          <small className="text-text-faint">
            Example:{" "}
            <code>file:///C:/Users/youruser/Documents/minimate/animals</code>
          </small>
        </div>

        <hr className="border-border" />

        {/* Titles (.txt) */}
        <div className="space-y-1">
          <Label htmlFor="titlesFile">Titles (.txt) file:</Label>
          <input
            id="titlesFile"
            type="file"
            accept=".txt"
            onChange={handleTitlesFileChange}
            disabled={loadingTitles}
            className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-accent-fg hover:file:bg-accent-hover"
          />
          {loadingTitles && <p className="text-text-muted">Loading titles...</p>}
          {!!titles.length && (
            <p className="mt-2 text-text-muted">
              Loaded {titles.length} lines from text file
            </p>
          )}
        </div>

        {/* Images folder (webkitdirectory) */}
        <div className="space-y-1">
          <Label htmlFor="imagesFolder">
            Images Folder (should contain .png files):
          </Label>
          <input
            id="imagesFolder"
            type="file"
            multiple
            // @ts-expect-error `webkitdirectory` is a valid DOM attribute missing from React's input types
            webkitdirectory="true"
            onChange={handleImagesFolderChange}
            disabled={loadingImages}
            className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-accent-fg hover:file:bg-accent-hover"
          />
          {loadingImages && <p className="text-text-muted">Loading images...</p>}
          {!!images.length && (
            <p className="mt-2 text-text-muted">
              Loaded {images.length} .png files from folder
            </p>
          )}
        </div>

        {/* Create All button */}
        <Button
          variant="primary"
          onClick={handleCreateAllJobs}
          loading={creatingAll}
          disabled={creatingAll}
        >
          {creatingAll ? "Creating jobs..." : "Create All Jobs"}
        </Button>
      </Card>

      {/* Results table */}
      {!!jobResults.length && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Created Jobs</h2>
          <Card>
            <Table>
              <THead>
                <TR>
                  <TH>Title</TH>
                  <TH>Image Path</TH>
                  <TH>Status</TH>
                  <TH>UID</TH>
                </TR>
              </THead>
              <TBody>
                {jobResults.map((r, idx) => (
                  <TR key={idx}>
                    <TD>{r.title}</TD>
                    <TD>{r.imagePath}</TD>
                    <TD>
                      <Badge status={r.status}>{r.status}</Badge>
                    </TD>
                    <TD>{r.uid}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
