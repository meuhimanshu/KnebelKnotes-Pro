import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const BUCKET_NAME = "admin-profile-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PREVIEW_SIZE = 240;
const OUTPUT_SIZE = 512;

type Offset = { x: number; y: number };

type ProfileImageUploaderProps = {
  userId: string;
  initialPath?: string | null;
  disabled?: boolean;
  onUploaded?: (path: string | null) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ProfileImageUploader = ({ userId, initialPath, disabled, onUploaded }: ProfileImageUploaderProps) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const baseScale = useMemo(() => {
    if (!image) return 1;
    return Math.max(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height);
  }, [image]);

  const clampOffset = (next: Offset) => {
    if (!image) return next;
    const scale = baseScale * zoom;
    const maxX = Math.max(0, (image.width * scale - PREVIEW_SIZE) / 2);
    const maxY = Math.max(0, (image.height * scale - PREVIEW_SIZE) / 2);
    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  };

  const loadSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 60 * 60);
    if (error) {
      toast.error("Profile image could not be loaded.");
      return;
    }
    setImageUrl(data.signedUrl);
  };

  useEffect(() => {
    if (!initialPath) {
      setImageUrl(null);
      return;
    }
    void loadSignedUrl(initialPath);
  }, [initialPath]);

  useEffect(() => {
    if (!editorUrl) {
      setImage(null);
      return;
    }

    setLoadingImage(true);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setLoadingImage(false);
    };
    img.onerror = () => {
      toast.error("Failed to load image for editing.");
      setLoadingImage(false);
    };
    img.src = editorUrl;
  }, [editorUrl]);

  useEffect(() => {
    if (!image || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    renderImage(canvas, image, PREVIEW_SIZE, { zoom, rotation, offset, baseScale });
  }, [image, zoom, rotation, offset, baseScale]);

  useEffect(() => {
    setOffset((prev) => clampOffset(prev));
  }, [zoom, baseScale]);

  useEffect(() => {
    if (!editorUrl) return;
    return () => {
      URL.revokeObjectURL(editorUrl);
    };
  }, [editorUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size cannot exceed 5MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setEditorUrl(url);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return;
    dragging.current = true;
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    setOffset(clampOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleUpload = async () => {
    if (!image) {
      toast.error("Choose an image before uploading.");
      return;
    }
    try {
      setUploading(true);
      const outputCanvas = document.createElement("canvas");
      const scaleRatio = OUTPUT_SIZE / PREVIEW_SIZE;
      const outputOffset = { x: offset.x * scaleRatio, y: offset.y * scaleRatio };
      renderImage(outputCanvas, image, OUTPUT_SIZE, {
        zoom,
        rotation,
        offset: outputOffset,
        baseScale: baseScale * scaleRatio,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        outputCanvas.toBlob((value) => resolve(value), "image/webp", 0.9);
      });

      if (!blob) {
        toast.error("Failed to crop or rotate image. Please retry.");
        setUploading(false);
        return;
      }

      const path = `${userId}/avatar.webp`;
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, blob, {
        upsert: true,
        contentType: "image/webp",
        cacheControl: "0",
      });

      if (uploadError) {
        toast.error("Profile image upload failed. Please try again.");
        setUploading(false);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ profile_image_path: path })
        .eq("id", userId);

      if (profileError) {
        toast.error("Profile image upload failed. Please try again.");
        setUploading(false);
        return;
      }

      await loadSignedUrl(path);
      setEditorUrl(null);
      onUploaded?.(path);
      toast.success("Profile image updated.");
    } catch {
      toast.error("Profile image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-border bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upload a JPG, PNG, or WebP image (max 5MB). Crop and rotate before saving.
          </p>
          <input
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={disabled}
            className="block text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          />
        </div>
      </div>

      {editorUrl && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "relative h-[240px] w-[240px] overflow-hidden rounded-xl border border-border bg-muted/60",
                  loadingImage && "opacity-60",
                )}
              >
                <canvas
                  ref={previewCanvasRef}
                  width={PREVIEW_SIZE}
                  height={PREVIEW_SIZE}
                  className="h-full w-full touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>
              <p className="text-xs text-muted-foreground">Drag to reposition the crop area.</p>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Zoom</p>
                <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={([value]) => setZoom(value)} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Rotate</p>
                <Slider
                  value={[rotation]}
                  min={-180}
                  max={180}
                  step={1}
                  onValueChange={([value]) => setRotation(value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditorUrl(null)} disabled={uploading}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpload} disabled={uploading || disabled || loadingImage}>
                  {uploading ? "Uploading..." : "Save image"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renderImage = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  size: number,
  options: { zoom: number; rotation: number; offset: Offset; baseScale: number },
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { zoom, rotation, offset, baseScale } = options;
  const scale = baseScale * zoom;

  canvas.width = size;
  canvas.height = size;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();
};

export default ProfileImageUploader;
