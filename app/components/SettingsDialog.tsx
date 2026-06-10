"use client";

import React, { useEffect, useState } from "react";
import { Button, Dialog, Input, Label } from "@/app/components/ui";
import {
  getManagedConfig,
  setSecret,
  restartApp,
  pickDirectory,
} from "@/app/lib/desktop";

interface Field {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
}

interface Section {
  title: string;
  fields: Field[];
}

// Mirrors MANAGED_KEYS in src-tauri/src/secrets.rs (WORKING_DIRECTORY is handled
// separately with a folder picker).
const SECTIONS: Section[] = [
  {
    title: "AI generation",
    fields: [
      { key: "OPENAI_API_KEY", label: "OpenAI API key", secret: true },
      { key: "GROK_API_KEY", label: "Grok API key", secret: true },
    ],
  },
  {
    title: "Nexrender",
    fields: [
      {
        key: "NEXRENDER_SERVER_URL",
        label: "Server URL",
        placeholder: "http://localhost:3000",
      },
      { key: "NEXRENDER_SECRET", label: "Secret", secret: true },
    ],
  },
  {
    title: "YouTube",
    fields: [
      { key: "GOOGLE_CLIENT_ID", label: "Google client ID" },
      { key: "GOOGLE_CLIENT_SECRET", label: "Google client secret", secret: true },
      { key: "YOUTUBE_CLIENT_ID", label: "YouTube client ID" },
      { key: "YOUTUBE_CLIENT_SECRET", label: "YouTube client secret", secret: true },
      { key: "YOUTUBE_REDIRECT", label: "Redirect URI" },
      { key: "YOUTUBE_TOKEN_JSON", label: "OAuth token (JSON)", secret: true },
    ],
  },
  {
    title: "TikTok",
    fields: [
      { key: "TIKTOK_CLIENT_KEY", label: "Client key" },
      { key: "TIKTOK_CLIENT_SECRET", label: "Client secret", secret: true },
      { key: "TIKTOK_REDIRECT_URI", label: "Redirect URI" },
    ],
  },
];

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    void getManagedConfig().then((config) => {
      if (active) setValues(config);
    });
    return () => {
      active = false;
    };
  }, [isOpen]);

  const update = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(values).map(([key, value]) => setSecret(key, value)),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await saveAll();
    onClose();
  };

  const handleSaveAndRestart = async () => {
    await saveAll();
    await restartApp();
  };

  const browseWorkingDir = async () => {
    const dir = await pickDirectory({
      title: "Choose working directory",
      defaultPath: values.WORKING_DIRECTORY,
    });
    if (dir) update("WORKING_DIRECTORY", dir);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <span className="text-xs text-text-faint">
            Stored securely in your OS keychain · restart to apply
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleSave} disabled={saving}>
              Save
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAndRestart}
              disabled={saving}
            >
              Save &amp; Restart
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Working directory — path with a native folder picker. */}
        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-text">Working directory</h4>
          <div className="flex gap-2">
            <Input
              value={values.WORKING_DIRECTORY ?? ""}
              onChange={(e) => update("WORKING_DIRECTORY", e.target.value)}
              placeholder="Where rendered assets live"
              className="flex-1"
            />
            <Button variant="secondary" onClick={browseWorkingDir}>
              Browse…
            </Button>
          </div>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <h4 className="text-sm font-semibold text-text">{section.title}</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.secret ? "password" : "text"}
                    autoComplete="off"
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => update(field.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
