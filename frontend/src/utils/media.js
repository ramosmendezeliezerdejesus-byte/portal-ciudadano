export function isVideoUrl(url) {
  return Boolean(url && /\.(mp4|webm|mov)(\?|$)/i.test(url));
}

export function isPdfUrl(url) {
  return Boolean(url && /\.pdf(\?|$)/i.test(url));
}

export function isDocumentUrl(url) {
  return Boolean(url && /\.(doc|docx)(\?|$)/i.test(url));
}

export function normalizeMediaUrls(item) {
  const urls = [];
  const mediaUrls = Array.isArray(item?.media_urls) ? item.media_urls : [];
  const mediaFiles = Array.isArray(item?.media_files) ? item.media_files : [];

  mediaUrls.forEach((url) => {
    if (typeof url === "string" && url.trim() && !urls.includes(url)) {
      urls.push(url);
    }
  });

  mediaFiles.forEach((file) => {
    const url = typeof file?.url === "string" ? file.url.trim() : "";
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  });

  [item?.image_url, item?.video_url].forEach((url) => {
    if (typeof url === "string" && url.trim() && !urls.includes(url)) {
      urls.push(url);
    }
  });

  return urls;
}

export function normalizeEvidenceFiles(item) {
  const files = [];
  const evidenceFiles = Array.isArray(item?.evidence_files) ? item.evidence_files : [];

  evidenceFiles.forEach((file, index) => {
    const url = typeof file?.url === "string" ? file.url.trim() : "";
    if (!url || files.some((entry) => entry.url === url)) return;

    files.push({
      url,
      path: typeof file?.path === "string" ? file.path : null,
      name: typeof file?.name === "string" && file.name.trim() ? file.name.trim() : `Evidencia ${index + 1}`,
      kind: typeof file?.kind === "string" ? file.kind : guessFileKind(url),
    });
  });

  if (item?.evidence_url && !files.some((entry) => entry.url === item.evidence_url)) {
    files.push({
      url: item.evidence_url,
      path: item.evidence_path ?? null,
      name: "Evidencia 1",
      kind: guessFileKind(item.evidence_url),
    });
  }

  return files;
}

export function guessFileKind(url) {
  if (isPdfUrl(url)) return "pdf";
  if (isVideoUrl(url)) return "video";
  if (isDocumentUrl(url)) return "document";
  return "image";
}
