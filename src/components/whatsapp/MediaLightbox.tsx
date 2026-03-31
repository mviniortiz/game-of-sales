import React, { useEffect } from "react";
import { X, Download } from "lucide-react";

export function MediaLightbox({
    src,
    type,
    onClose,
}: {
    src: string;
    type: "image" | "video";
    onClose: () => void;
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-105 z-10"
            >
                <X className="h-5 w-5" />
            </button>
            <a
                href={src}
                download
                onClick={(e) => e.stopPropagation()}
                className="absolute top-4 right-16 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-105 z-10"
            >
                <Download className="h-5 w-5" />
            </a>
            <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh]">
                {type === "image" ? (
                    <img src={src} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
                ) : (
                    <video src={src} controls autoPlay className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
                )}
            </div>
        </div>
    );
}
