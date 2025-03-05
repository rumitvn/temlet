"use client";

import React, { useState } from "react";

/**
 * Renders a single quiz job from a user-supplied JSON file,
 * building the Nexrender request body from the data.
 */
export default function RenderQuizAnimalsPage() {
  // 1) State for the loaded quiz JSON
  const [quizData, setQuizData] = useState<any | null>(null);

  // 2) Some default config values
  const [templateSrc, setTemplateSrc] = useState(
    "file:///C:/Users/youruser/Documents/AEProjects/Envato-Trivia-Quiz-Game-Template/After Effects/Vertical Trivia Quiz Template (converted).aep"
  );
  const [composition, setComposition] = useState("Final");
  const [outputFolder, setOutputFolder] = useState(
    "D:/nexrender-output/quiz_animals"
  );

  const [loadingJson, setLoadingJson] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);

  // 3) Job creation result
  const [createdUid, setCreatedUid] = useState<string | null>(null);
  const [createdState, setCreatedState] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --------------------------------------------
  // Step A: Select and load JSON file
  // --------------------------------------------
  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingJson(true);
    setQuizData(null);
    setCreatedUid(null);
    setCreatedState(null);
    setErrorMessage(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setQuizData(json);
    } catch (err) {
      console.error(err);
      alert("Failed to parse the JSON file");
    } finally {
      setLoadingJson(false);
    }
  };

  // --------------------------------------------
  // Step B: Build the Nexrender request body from the JSON
  // --------------------------------------------
  function buildRequestBody(data: any) {
    // data.key => "alligator"
    // data.order => 1
    const key = data.key || "unknown_key";
    const order = data.order || 1;
    const keyOrder = `${key}_${order}`; // e.g. "alligator_1"

    // Helper to build voice/audio path
    const voicePath = (layer: string) =>
      `file:///C:/Users/youruser/Documents/minimate/animals/voice/${keyOrder}/${layer}.mp3`;

    // Helper for image path
    const imagePath = (name: string) =>
      `file:///C:/Users/youruser/Documents/minimate/animals/image/${name}.jpg`;

    // Helper for video path
    const videoPath = (name: string) =>
      `file:///C:/Users/youruser/Documents/minimate/animals/video/${name}.mp4`;

    // Extract quiz data
    const intro = data.intro || {};
    const quiz1 = data.quiz_1 || {};
    const quiz2 = data.quiz_2 || {};
    const quiz3 = data.quiz_3 || {};
    const lesson = data.lesson || {};
    const reward = data.reward || {};

    // We'll build an array of assets
    const assets = [
      // ---------------------------
      // Region: Intro
      // ---------------------------
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

      // ---------------------------
      // Region: Quiz 1
      // ---------------------------
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

      // ---------------------------
      // Region: Quiz 2
      // ---------------------------
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

      // ---------------------------
      // Region: Quiz 3
      // ---------------------------
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
      // quiz_3 has image answers instead of text
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

      // ---------------------------
      // Region: Lesson + Reward
      // ---------------------------
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
        src: `file:///C:/Users/youruser/Documents/minimate/animals/reward/output/reward_${order}/${key}.mp4`,
      },
      {
        type: "audio",
        layerName: "voice_reward",
        src: voicePath("voice_reward"),
      },
    ];

    // Build final request body
    const requestBody = {
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

    return requestBody;
  }

  // --------------------------------------------
  // Step C: Submit job
  // --------------------------------------------
  async function handleCreateJob() {
    if (!quizData) {
      alert("Please select a JSON file first.");
      return;
    }
    setCreatingJob(true);
    setCreatedUid(null);
    setCreatedState(null);
    setErrorMessage(null);

    try {
      const body = buildRequestBody(quizData);
      const res = await fetch("http://localhost:3000/api/v1/jobs", {
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
      setCreatedUid(result.uid);
      setCreatedState(result.state || "queued");
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Error creating job");
    } finally {
      setCreatingJob(false);
    }
  }

  // --------------------------------------------
  // RENDER
  // --------------------------------------------
  // If we have quizData, let's build the final request for display
  const displayRequest = quizData ? buildRequestBody(quizData) : null;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Render Quiz Animals</h1>

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
        <label style={styles.label}>
          Output Folder (e.g. D:/nexrender-output/quiz_animals):
        </label>
        <input
          style={styles.input}
          type="text"
          value={outputFolder}
          onChange={(e) => setOutputFolder(e.target.value)}
        />
      </div>

      <hr style={{ margin: "1rem 0" }} />

      <div style={styles.field}>
        <label style={styles.label}>Select Quiz JSON:</label>
        <input
          type="file"
          accept=".json"
          onChange={handleJsonFileChange}
          disabled={loadingJson}
        />
        {loadingJson && <p>Loading JSON...</p>}
        {quizData && (
          <p style={{ marginTop: "0.5rem" }}>
            Loaded quiz for <strong>{quizData.key}</strong> (order: {quizData.order})
          </p>
        )}
      </div>

      <button style={styles.button} onClick={handleCreateJob} disabled={creatingJob}>
        {creatingJob ? "Creating job..." : "Create Job"}
      </button>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      {/* Show job creation result */}
      {createdUid && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            <strong>Job created!</strong> UID: {createdUid}, state: {createdState}
          </p>
        </div>
      )}

      {/* For clarity, let's show the final "assets" array */}
      {displayRequest && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Request Body Preview</h2>
          <pre style={styles.pre}>
            {JSON.stringify(displayRequest, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------
// Some inline styles
// --------------------------------------------
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
  pre: {
    backgroundColor: "#333",
    color: "#eee",
    padding: "1rem",
    overflowX: "auto" as const,
    maxHeight: "400px",
  },
};
