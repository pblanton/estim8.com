import { useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '../../components/layout/AppHeader';
import { topicApi } from '../../api/sessions';
import { fileApi } from '../../api/files';
import { ApiError } from '../../api/client';

export function TopicEditorPage() {
  const { sessionId, topicId } = useParams<{ sessionId: string; topicId: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: topicsData } = useQuery({
    queryKey: ['session-topics', sessionId],
    queryFn: () => topicApi.list(sessionId!),
    enabled: Boolean(sessionId),
  });
  const topic = topicsData?.topics.find((t) => t.id === topicId);

  const { data: filesData } = useQuery({
    queryKey: ['topic-files', topicId],
    queryFn: () => fileApi.list(topicId!),
    enabled: Boolean(topicId),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (topic && !initialized) {
    setName(topic.name);
    setDescription(topic.description ?? '');
    setInitialized(true);
  }

  const saveDetails = useMutation({
    mutationFn: () => topicApi.update(topicId!, { name: name.trim(), description: description.trim() || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session-topics', sessionId] }),
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => fileApi.remove(fileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topic-files', topicId] }),
  });

  async function onSaveDetails(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await saveDetails.mutateAsync();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save topic.');
    }
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || !topicId) return;
    setUploading(true);
    setError(null);
    try {
      await fileApi.upload(topicId, files);
      queryClient.invalidateQueries({ queryKey: ['topic-files', topicId] });
    } catch {
      setError('Upload failed. Check file type (images, PDF, text/markdown) and size (max 20MB).');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div>
      <AppHeader />
      <main className="app-main">
        <Link to={`/sessions/${sessionId}`}>&larr; Back to session</Link>
        <h1>Edit topic</h1>

        <form className="form-stack" onSubmit={onSaveDetails} style={{ maxWidth: 520 }}>
          <div className="form-field">
            <label htmlFor="name">Topic name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={saveDetails.isPending}>
            Save
          </button>
        </form>

        <section style={{ marginTop: '2rem' }}>
          <h2>Slideshow files</h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Upload images, PDFs, or text files. They'll appear in upload order in the slideshow during discussion.
          </p>
          <div
            className="file-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFilesSelected(e.dataTransfer.files);
            }}
          >
            {uploading ? 'Uploading…' : 'Drag files here, or'}{' '}
            <button type="button" className="btn btn-secondary btn-small" onClick={() => fileInputRef.current?.click()}>
              choose files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/markdown"
              style={{ display: 'none' }}
              onChange={(e) => onFilesSelected(e.target.files)}
            />
          </div>

          <div className="file-list">
            {filesData?.files.map((file) => (
              <div className="file-chip" key={file.id}>
                {file.original_filename}
                {!file.is_generated && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => deleteFile.mutate(file.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
