import type { UploadResponse } from "@datachat/shared-types";

interface UploadCallbacks {
  onProgress: (percent: number) => void;
  onUploadComplete: () => void;
}

export function uploadFile(
  file: File,
  callbacks: UploadCallbacks
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        callbacks.onProgress(percent);
      }
    });

    xhr.upload.addEventListener("load", () => {
      callbacks.onUploadComplete();
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as UploadResponse);
        } else {
          reject(new Error(data.error || "Upload failed"));
        }
      } catch {
        reject(new Error("Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}
