import { guessFileKind } from "./media";

const MEDIA_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const IMAGE_PREFIX = "image/";
const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024;

function isAcceptedFile(file, mode) {
  if (!file?.type) return false;
  const isAccepted =
    file.type.startsWith(IMAGE_PREFIX)
    || MEDIA_VIDEO_TYPES.has(file.type)
    || DOCUMENT_TYPES.has(file.type);

  if (mode === "media" || mode === "evidence") {
    return isAccepted;
  }
  return isAccepted;
}

function detectKind(file) {
  if (file.type === "application/pdf") return "pdf";
  if (DOCUMENT_TYPES.has(file.type) && !file.type.startsWith(IMAGE_PREFIX) && !MEDIA_VIDEO_TYPES.has(file.type)) {
    return "document";
  }
  if (file.type.startsWith(IMAGE_PREFIX)) return "image";
  if (MEDIA_VIDEO_TYPES.has(file.type)) return "video";
  return guessFileKind(file.name);
}

export function mergeAttachmentFiles(currentItems, fileList, mode = "media", maxItems = 8) {
  const nextItems = [...currentItems];
  const files = Array.from(fileList ?? []);

  files.forEach((file) => {
    if (!isAcceptedFile(file, mode)) return;
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) return;

    const duplicate = nextItems.some(
      (item) => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified,
    );
    if (duplicate || nextItems.length >= maxItems) return;

    nextItems.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      name: file.name,
      kind: detectKind(file),
      previewUrl: file.type === "application/pdf" ? null : URL.createObjectURL(file),
    });
  });

  return nextItems;
}

export function cleanupAttachmentItems(items) {
  items.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
}

export async function uploadMediaItems(items, uploadFile, onProgress) {
  const uploads = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    onProgress?.({
      current: index + 1,
      total: items.length,
      item,
    });

    let result;
    try {
      result = await uploadFile(item.file);
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : "";
      throw new Error(`No se pudo subir "${item.name}".${detail}`);
    }

    uploads.push({
      url: result?.url ?? result,
      path: result?.path ?? null,
      name: item.name,
      kind: item.kind,
    });
  }

  return uploads;
}

export async function uploadEvidenceItems(items, uploadEvidence, onProgress) {
  const uploads = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    onProgress?.({
      current: index + 1,
      total: items.length,
      item,
    });

    let result;
    try {
      result = await uploadEvidence(item.file);
    } catch (error) {
      const detail = error?.message ? ` ${error.message}` : "";
      throw new Error(`No se pudo subir "${item.name}".${detail}`);
    }

    uploads.push({
      url: result.url,
      path: result.path,
      name: item.name,
      kind: item.kind,
    });
  }

  return uploads;
}
