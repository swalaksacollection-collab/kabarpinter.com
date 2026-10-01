"use client";

import { useState } from "react";
import { evaluateSubmission, type FilterRule } from "@/lib/filter";

// Runs the exact same evaluateSubmission() the submit action uses, against the
// current rules, so an admin can see what a draft rule set would do.
export function FilterTester({ rules }: { rules: FilterRule[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<ReturnType<typeof evaluateSubmission> | null>(null);

  return (
    <div className="cform" style={{ maxWidth: 640 }}>
      <label className="cform__label">
        Judul contoh
        <input className="cform__input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="cform__label">
        Isi contoh
        <textarea
          className="cform__textarea"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="btn-outline"
        onClick={() => setResult(evaluateSubmission(rules, { title, body }))}
      >
        Jalankan filter
      </button>
      {result && (
        <div
          className={
            result.action === "reject"
              ? "notice notice--error"
              : result.action === "flag"
                ? "notice notice--info"
                : "notice notice--success"
          }
        >
          <strong>
            {result.action === "reject"
              ? "Akan DITOLAK otomatis"
              : result.action === "flag"
                ? "Akan masuk antrean dengan peringatan"
                : "Lolos bersih"}
          </strong>
          {result.reasons.length > 0 && (
            <ul style={{ margin: "6px 0 0 18px" }}>
              {result.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
