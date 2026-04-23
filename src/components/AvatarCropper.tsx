"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { IconClose } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/Pill";

const OUTPUT_SIZE = 512; // px — final square avatar size

type Props = {
  file: File | null;
  onCancel: () => void;
  /** Called with a cropped Blob (JPEG). */
  onConfirm: (blob: Blob) => void;
};

function centerInitialCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
    width,
    height,
  );
}

/**
 * Modal cropper for the profile avatar. User drags / resizes a circular
 * crop area. On confirm we rasterise a 512x512 JPEG via <canvas> and pass
 * the Blob to the caller for upload.
 */
export function AvatarCropper({ file, onCancel, onConfirm }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerInitialCrop(width, height));
  }, []);

  async function confirm() {
    if (!imgRef.current || !completedCrop) return;
    setSaving(true);
    try {
      const blob = await cropToBlob(imgRef.current, completedCrop, scale);
      onConfirm(blob);
    } finally {
      setSaving(false);
    }
  }

  if (!file || !src) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#14110e]/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-[#faf8f5] rounded-3xl w-full max-w-[520px] overflow-hidden border border-black/8 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/8">
          <div>
            <SectionLabel>Beskjær bilde</SectionLabel>
            <h2 className="text-[18px] font-medium tracking-tight mt-1">
              Velg fokus
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="size-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#14110e]/60"
            aria-label="Lukk"
          >
            <IconClose size={18} />
          </button>
        </header>

        <div className="p-6 bg-[#eee9df]/40 flex flex-col items-center gap-4">
          <div className="max-w-full overflow-hidden rounded-2xl bg-[#14110e]/5">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
              keepSelection
              minWidth={80}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={src}
                alt=""
                onLoad={onImageLoad}
                style={{
                  maxHeight: "55vh",
                  maxWidth: "100%",
                  transform: `scale(${scale})`,
                  transformOrigin: "center",
                }}
              />
            </ReactCrop>
          </div>

          <div className="w-full flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/55 shrink-0">
              Zoom
            </span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-[#c15a3a]"
            />
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-black/8 flex items-center justify-end gap-2 bg-[#faf8f5]">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-[12px] border border-black/15 hover:border-black/30"
          >
            Avbryt
          </button>
          <button
            onClick={confirm}
            disabled={!completedCrop || saving}
            className="px-5 py-2 rounded-full bg-[#14110e] text-[#faf8f5] text-[12px] font-medium hover:bg-[#c15a3a] disabled:opacity-50"
          >
            {saving ? "Beskjærer …" : "Lagre bilde"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Rasterises the selected crop area (in display px) back onto the full-res
 * source image, accounting for the CSS `scale(...)` transform applied during
 * preview. Outputs a square 512×512 JPEG.
 */
async function cropToBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  scale: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas ikke tilgjengelig");

  // react-image-crop gives crop coords in the *displayed* image's coord space.
  // Convert to natural source px, compensating for the CSS scale the user
  // applied through our zoom slider.
  const displayToNatural = image.naturalWidth / image.width / scale;

  const sx = crop.x * displayToNatural;
  const sy = crop.y * displayToNatural;
  const sWidth = crop.width * displayToNatural;
  const sHeight = crop.height * displayToNatural;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Kunne ikke generere bilde"))),
      "image/jpeg",
      0.92,
    );
  });
}
