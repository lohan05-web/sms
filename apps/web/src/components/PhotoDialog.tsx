import { useState, type ChangeEvent } from 'react';
import { fileToPhotoDataUrl } from '../lib/image';
import { Modal } from './Modal';

export function PhotoDialog({
  title,
  currentUrl,
  onClose,
  onSave,
}: {
  title: string;
  currentUrl?: string | null;
  onClose: () => void;
  onSave: (photoUrl: string | null) => Promise<void>;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      setPreview(await fileToPhotoDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process the image');
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the photo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="form">
        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="photo-editor">
          {preview ? (
            <img className="photo-editor__preview" src={preview} alt="Selected photo" />
          ) : (
            <div className="photo-editor__preview photo-editor__preview--empty">No photo</div>
          )}
          <div className="photo-editor__controls">
            <label className="btn btn--ghost btn--sm">
              Choose image
              <input type="file" accept="image/*" hidden onChange={handleFile} />
            </label>
            {preview ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setPreview(null)}
                disabled={busy}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <p className="field__help">Images are resized automatically before they are saved.</p>

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save photo'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
