import { isDocumentUrl, isPdfUrl, isVideoUrl } from "../utils/media";

export default function MediaGallery({ urls, className = "", itemClassName = "" }) {
  const mediaUrls = Array.isArray(urls) ? urls.filter((url) => typeof url === "string" && url.trim()) : [];

  if (!mediaUrls.length) return null;

  return (
    <div className={className || "grid grid-cols-1 sm:grid-cols-2 gap-3"}>
      {mediaUrls.map((url, index) => (
        isVideoUrl(url) ? (
          <video
            key={`${url}-${index}`}
            src={url}
            controls
            className={itemClassName || "w-full max-h-72 rounded-xl bg-black object-cover"}
          />
        ) : isPdfUrl(url) || isDocumentUrl(url) ? (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={itemClassName || "flex min-h-40 items-center justify-center rounded-xl border border-brand-teal/20 bg-brand-cream p-6 text-center dark:bg-brand-navy/30"}
          >
            <div className="space-y-2">
              <i className={`fas ${isPdfUrl(url) ? "fa-file-pdf text-red-500" : "fa-file-word text-blue-500"} text-4xl`}></i>
              <p className="text-sm font-semibold text-brand-teal">Abrir adjunto</p>
            </div>
          </a>
        ) : (
          <img
            key={`${url}-${index}`}
            src={url}
            alt={`Adjunto ${index + 1}`}
            className={itemClassName || "w-full max-h-72 rounded-xl object-cover"}
          />
        )
      ))}
    </div>
  );
}
