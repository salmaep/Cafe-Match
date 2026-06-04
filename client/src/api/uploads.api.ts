import apiClient from "./client";

export interface UploadResult {
  url: string;
  mediaType: "photo" | "video";
  size: number;
  mimeType: string;
}

export const uploadsApi = {
  reviewMedia: async (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<UploadResult>(
      "/uploads/review-media",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      },
    );
    return res.data;
  },
};
