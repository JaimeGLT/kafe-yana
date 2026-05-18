import React, { useRef, useState } from 'react';
import { X, ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface ImageUploadFieldProps {
  existingUrl?: string;
  onChange?: (file: File | null) => void;
  className?: string;
  square?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  existingUrl,
  onChange,
  className,
  square = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl ?? null);
  const [isDragging, setIsDragging] = useState(false);

  React.useEffect(() => {
    setPreview(existingUrl ?? null);
  }, [existingUrl]);

  const applyFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onChange?.(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={clsx('w-full', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); }}
      />

      {preview ? (
        <div className={clsx('relative rounded-xl overflow-hidden border border-coffee-200 bg-coffee-50', square ? 'h-48 w-48 mx-auto' : 'w-full h-32')}>
          <img src={preview} alt="Imagen del producto" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
            title="Quitar imagen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded-md hover:bg-black/70 transition-colors"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) applyFile(f);
          }}
          className={clsx(
            'border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer',
            square ? 'h-48 w-48 mx-auto' : 'w-full h-28',
            isDragging
              ? 'border-coffee-400 bg-coffee-50 text-coffee-600'
              : 'border-coffee-200 text-coffee-400 hover:border-coffee-400 hover:text-coffee-600 hover:bg-coffee-50',
          )}
        >
          <div className="p-2 rounded-lg bg-coffee-100">
            <ImageIcon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium">Subir imagen</span>
          <span className="text-xs text-coffee-300">PNG · JPG · WEBP — arrastra o haz clic</span>
        </button>
      )}
    </div>
  );
};
