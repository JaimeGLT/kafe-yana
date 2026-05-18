import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, ConfirmModal } from '../../components/ui';
import { ImageUploadField } from '../../components/ui/ImageUpload';
import { toast } from '../../components/ui/Toast';
import { api } from '../../lib/api';

export const SettingsQRPage: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    api.get<{ Url: string }>('/Qr')
      .then(data => setCurrentUrl(data.Url || null))
      .catch(() => toast.error('Error', 'No se pudo cargar la imagen QR actual.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!pendingFile) return;
    setIsSaving(true);
    try {
      const form = new FormData();
      form.append('Imagen', pendingFile);

      const data = currentUrl
        ? await api.putForm<{ Url: string }>('/Qr', form)
        : await api.postForm<{ Url: string }>('/Qr', form);

      setCurrentUrl(data.Url);
      setPendingFile(null);
      setUploadKey(k => k + 1);
      toast.success('QR guardado', 'La imagen QR fue actualizada correctamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el QR.';
      toast.error('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/Qr/eliminar');
      setCurrentUrl(null);
      setConfirmOpen(false);
      toast.success('QR eliminado', 'La imagen QR fue eliminada.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el QR.';
      toast.error('Error', message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-coffee-100 shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-coffee-900">Imagen QR de Pago</h3>
        <p className="text-sm text-coffee-500 mt-1">
          Sube la imagen QR que se mostrará a los clientes para pagos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="text-sm font-medium text-coffee-700">Nueva imagen</p>
          <ImageUploadField
            key={uploadKey}
            onChange={setPendingFile}
            square
          />
          <Button
            onClick={handleSave}
            disabled={!pendingFile || isSaving}
            isLoading={isSaving}
            className="w-full"
          >
            {currentUrl ? 'Reemplazar QR' : 'Guardar QR'}
          </Button>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-coffee-700">Imagen actual</p>
          {isLoading ? (
            <div className="rounded-xl border border-coffee-200 bg-coffee-50 flex items-center justify-center min-h-[12rem]">
              <div className="w-6 h-6 border-2 border-coffee-300 border-t-coffee-800 rounded-full animate-spin" />
            </div>
          ) : currentUrl ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-coffee-200 bg-coffee-50 flex items-center justify-center p-4 min-h-[12rem]">
                <img
                  src={currentUrl}
                  alt="QR actual"
                  className="max-h-48 object-contain"
                />
              </div>
              <Button
                variant="danger"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmOpen(true)}
                className="w-full"
              >
                Eliminar QR
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-coffee-200 bg-coffee-50 flex items-center justify-center min-h-[12rem]">
              <p className="text-sm text-coffee-400">Sin imagen QR configurada</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar imagen QR"
        message="¿Estás seguro de que deseas eliminar la imagen QR? Esta acción no se puede deshacer."
        confirmText={isDeleting ? 'Eliminando…' : 'Eliminar'}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
