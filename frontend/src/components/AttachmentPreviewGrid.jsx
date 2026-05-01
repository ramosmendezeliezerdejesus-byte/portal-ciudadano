import { isDocumentUrl, isPdfUrl, isVideoUrl } from "../utils/media";

function FileCard({ item, onRemove }) {
  const url = item.previewUrl || item.url;
  const isPdf = item.kind === "pdf" || isPdfUrl(url);
  const isVideo = item.kind === "video" || isVideoUrl(url);
  const isDocument = item.kind === "document" || isDocumentUrl(url);

  return (
    <div className="relative rounded-xl overflow-hidden border border-brand-teal/20 bg-brand-cream dark:bg-brand-navy/30">
      {isPdf ? (
        <div className="h-28 flex flex-col items-center justify-center gap-2">
          <i className="fas fa-file-pdf text-red-500 text-2xl"></i>
          <span className="text-[11px] px-3 text-center text-gray-500 line-clamp-2">{item.name}</span>
        </div>
      ) : isDocument ? (
        <div className="h-28 flex flex-col items-center justify-center gap-2">
          <i className="fas fa-file-word text-blue-500 text-2xl"></i>
          <span className="text-[11px] px-3 text-center text-gray-500 line-clamp-2">{item.name}</span>
        </div>
      ) : isVideo ? (
        <video src={url} controls className="w-full h-28 object-cover bg-black" />
      ) : (
        <img src={url} alt={item.name || "Adjunto"} className="w-full h-28 object-cover" />
      )}

      <div className="px-2.5 py-2 text-[11px] text-gray-600 dark:text-gray-300 truncate border-t border-brand-teal/10">
        {item.name}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 w-7 h-7 bg-black/65 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-xs transition-colors"
        >
          <i className="fas fa-times"></i>
        </button>
      )}
    </div>
  );
}

export default function AttachmentPreviewGrid({ items, onRemove, emptyText = "" }) {
  if (!items?.length) {
    return emptyText ? <p className="text-xs text-gray-400">{emptyText}</p> : null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <FileCard key={item.id || item.url} item={item} onRemove={onRemove} />
      ))}
    </div>
  );
}
