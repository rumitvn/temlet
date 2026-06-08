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

type QuizResult = {
  fileName: string;   // e.g. "alligator_1.json"
  status: "pending" | "creating" | "success" | "error";
  uid?: string;       // job uid on success
  error?: string;     // error message if any
};

export default function RenderQuizAnimalsPage() {
  // 1) We can store references to the File objects here
  const [jsonFiles, setJsonFiles] = useState<File[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  // Some default config values
  const [templateSrc, setTemplateSrc] = useState(
    "file:///C:/Users/youruser/Documents/AEProjects/Envato-Trivia-Quiz-Game-Template/After Effects/Vertical Trivia Quiz Template (converted).aep"
  );
  const [composition, setComposition] = useState("Final");
  const [outputFolder, setOutputFolder] = useState("D:/nexrender-output/quiz_animals");

  const [loadingFiles, setLoadingFiles] = useState(false);
  const [creatingAll, setCreatingAll] = useState(false);

  // --------------------------
  // Handle user selecting multiple .json files
  // --------------------------
  const handleJsonFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    // Convert FileList to an array
    const arr = Array.from(fileList);
    setJsonFiles(arr);

    // Initialize quizResults to "pending" for each file
    const results = arr.map((f) => ({
      fileName: f.name,
      status: "pending" as const,
    }));
    setQuizResults(results);
  };

  // --------------------------
  // Build the Nexrender request body from one JSON's data
  // --------------------------
  function buildRequestBody(data: any, channel: string = "minimate", topic: string = "animals") {
    const key = data.key || "unknown_key";
    const order = data.order || 1;
    const keyOrder = `${key}_${order}`;

    // Helpers for building paths using configuration with parameters
    const voicePath = (layer: string) =>
      config.getAssetFileUrl(config.buildAssetPath("voice", channel, topic, `${keyOrder}/${layer}.mp3`));

    const imagePath = (name: string) =>
      config.getAssetFileUrl(config.buildAssetPath("image", channel, topic, `${name}.jpg`));

    const videoPath = (name: string) =>
      config.getAssetFileUrl(config.buildAssetPath("video", channel, topic, `${name}.mp4`));

    // Extract quiz data
    const intro = data.intro || {};
    const quiz1 = data.quiz_1 || {};
    const quiz2 = data.quiz_2 || {};
    const quiz3 = data.quiz_3 || {};
    const lesson = data.lesson || {};
    const reward = data.reward || {};

    const assets = [
      // Intro
      {
        type: "data",
        layerName: "intro_title",
        property: "Source Text",
        value: intro.text || "",
      },
      {
        type: "audio",
        layerName: "voice_title",
        src: voicePath("voice_title"),
      },
      {
        type: "image",
        layerName: "intro_image",
        src: imagePath(key),
      },
      {
        type: "image",
        layerName: "quiz_1_header_image",
        src: imagePath(key),
      },
      {
        type: "image",
        layerName: "quiz_2_header_image",
        src: imagePath(key),
      },

      // Quiz 1
      {
        type: "data",
        layerName: "quiz_1_question_title",
        property: "Source Text",
        value: quiz1.question?.text || "",
      },
      {
        type: "audio",
        layerName: "voice_q1_title",
        src: voicePath("voice_q1_title"),
      },
      {
        type: "data",
        layerName: "quiz_1_ans_1_title",
        property: "Source Text",
        value: quiz1.options?.[0] || "",
      },
      {
        type: "data",
        layerName: "quiz_1_ans_2_title",
        property: "Source Text",
        value: quiz1.options?.[1] || "",
      },
      {
        type: "data",
        layerName: "quiz_1_ans_3_title",
        property: "Source Text",
        value: quiz1.options?.[2] || "",
      },
      {
        type: "data",
        layerName: "quiz_1_ans_4_title",
        property: "Source Text",
        value: quiz1.options?.[3] || "",
      },
      {
        type: "audio",
        layerName: "voice_q1_ans",
        src: voicePath("voice_q1_ans"),
      },
      {
        type: "data",
        layerName: "quiz_1_controller",
        property: "Effects.Right Answer.Menu",
        value: quiz1.answer?.position?.toString() || "1",
      },

      // Quiz 2
      {
        type: "data",
        layerName: "quiz_2_question_title",
        property: "Source Text",
        value: quiz2.question?.text || "",
      },
      {
        type: "audio",
        layerName: "voice_q2_title",
        src: voicePath("voice_q2_title"),
      },
      {
        type: "data",
        layerName: "quiz_2_ans_1_title",
        property: "Source Text",
        value: quiz2.options?.[0] || "",
      },
      {
        type: "data",
        layerName: "quiz_2_ans_2_title",
        property: "Source Text",
        value: quiz2.options?.[1] || "",
      },
      {
        type: "audio",
        layerName: "voice_q2_ans",
        src: voicePath("voice_q2_ans"),
      },
      {
        type: "data",
        layerName: "quiz_2_controller",
        property: "Effects.Right Answer.Menu",
        value: quiz2.answer?.position?.toString() || "1",
      },

      // Quiz 3
      {
        type: "data",
        layerName: "quiz_3_question_title",
        property: "Source Text",
        value: quiz3.question?.text || "",
      },
      {
        type: "audio",
        layerName: "voice_q3_title",
        src: voicePath("voice_q3_title"),
      },
      {
        type: "image",
        layerName: "quiz_3_ans_1_image",
        src: imagePath(quiz3.options?.[0] || "shark"),
      },
      {
        type: "image",
        layerName: "quiz_3_ans_2_image",
        src: imagePath(quiz3.options?.[1] || "lion"),
      },
      {
        type: "image",
        layerName: "quiz_3_ans_3_image",
        src: imagePath(quiz3.options?.[2] || "hippo"),
      },
      {
        type: "image",
        layerName: "quiz_3_ans_4_image",
        src: imagePath(quiz3.options?.[3] || "rabbit"),
      },
      {
        type: "audio",
        layerName: "voice_q3_ans",
        src: voicePath("voice_q3_ans"),
      },
      {
        type: "data",
        layerName: "quiz_3_controller",
        property: "Effects.Right Answer.Menu",
        value: quiz3.answer?.position?.toString() || "1",
      },

      // Lesson + Reward
      {
        type: "video",
        layerName: "lesson_video",
        src: videoPath(key),
      },
      {
        type: "audio",
        layerName: "voice_lesson",
        src: voicePath("voice_lesson"),
      },
      {
        type: "video",
        layerName: "reward_video",
        src: config.getAssetFileUrl(config.buildAssetPath("reward", channel, topic, `output/reward_${order}/${key}.mp4`)),
      },
      {
        type: "audio",
        layerName: "voice_reward",
        src: voicePath("voice_reward"),
      },
    ];

    return {
      template: {
        src: templateSrc,
        composition,
      },
      assets,
      actions: {
        postrender: [
          {
            module: "@nexrender/action-copy",
            output: `${outputFolder}/${keyOrder}.mp4`,
            useJobId: "true",
          },
        ],
      },
    };
  }

  // --------------------------
  // For each selected JSON, parse it & create a job
  // --------------------------
  async function handleCreateAllJobs() {
    if (!jsonFiles.length) {
      alert("No JSON files selected!");
      return;
    }

    setCreatingAll(true);

    // We'll store updates in a new array as we go
    const newResults = [...quizResults];

    for (let i = 0; i < jsonFiles.length; i++) {
      const file = jsonFiles[i];
      // Mark "creating"
      newResults[i] = { ...newResults[i], status: "creating", error: "", uid: "" };
      setQuizResults([...newResults]);

      try {
        // 1) Parse the JSON
        const text = await file.text();
        const data = JSON.parse(text);

        // 2) Build request body
        const body = buildRequestBody(data);

        // 3) POST to Nexrender
        const res = await fetch(`${NEXRENDER_BASE_URL}/api/v1/jobs`, {
          method: "POST",
          headers: {
            "nexrender-secret": "myapisecret",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`Failed to create job: ${res.status}`);
        }
        const result = await res.json();

        // 4) Mark success
        newResults[i] = {
          ...newResults[i],
          status: "success",
          uid: result.uid || "",
        };
      } catch (err: any) {
        logger.error(err);
        newResults[i] = {
          ...newResults[i],
          status: "error",
          error: err.message || "Error creating job",
        };
      }

      setQuizResults([...newResults]);
    }

    setCreatingAll(false);
  }

  return (
    <div className="p-4 bg-bg text-text min-h-screen">
      <h1 className="text-2xl font-bold text-accent mb-4">
        Batch Render Quiz Animals
      </h1>

      <Card className="p-4 space-y-4">
        {/* Template Source, Composition, Output Folder */}
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
            Output Folder (e.g. D:/nexrender-output/quiz_animals):
          </Label>
          <Input
            id="outputFolder"
            type="text"
            value={outputFolder}
            onChange={(e) => setOutputFolder(e.target.value)}
          />
        </div>

        <hr className="border-border" />

        {/* Select multiple .json files */}
        <div className="space-y-1">
          <Label htmlFor="jsonFiles">Select Multiple Quiz JSON Files:</Label>
          <input
            id="jsonFiles"
            type="file"
            accept=".json"
            multiple
            onChange={handleJsonFilesChange}
            disabled={loadingFiles || creatingAll}
            className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-accent-fg hover:file:bg-accent-hover"
          />
          {!!jsonFiles.length && (
            <p className="mt-2 text-text-muted">
              Selected {jsonFiles.length} JSON file(s)
            </p>
          )}
        </div>

        {/* Create All Jobs Button */}
        <Button
          variant="primary"
          onClick={handleCreateAllJobs}
          loading={creatingAll}
          disabled={!jsonFiles.length || creatingAll}
        >
          {creatingAll ? "Creating Jobs..." : "Create All Jobs"}
        </Button>
      </Card>

      {/* Table of results */}
      {!!quizResults.length && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Job Creation Results</h2>
          <Card>
            <Table>
              <THead>
                <TR>
                  <TH>File</TH>
                  <TH>Status</TH>
                  <TH>UID</TH>
                  <TH>Error</TH>
                </TR>
              </THead>
              <TBody>
                {quizResults.map((res, index) => (
                  <TR key={index}>
                    <TD>{res.fileName}</TD>
                    <TD>
                      <Badge status={res.status}>{res.status}</Badge>
                    </TD>
                    <TD>{res.uid || "-"}</TD>
                    <TD>{res.error || "-"}</TD>
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
