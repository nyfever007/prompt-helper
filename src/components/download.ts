/** Trigger a client-side file download (no network). */
export const downloadText = (filename: string, text: string, type = "application/json") => {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const timestamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
