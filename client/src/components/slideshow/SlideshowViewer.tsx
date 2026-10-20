import { useEffect, useState } from 'react';
import type { TopicFile } from '../../api/files';
import { fileApi } from '../../api/files';

interface SlideshowViewerProps {
  topicId: string;
  files: TopicFile[];
  slideIndex: number;
  participantToken?: string;
}

function TextSlide({ url }: { url: string }) {
  const [text, setText] = useState('Loading…');
  useEffect(() => {
    let cancelled = false;
    fetch(url, { credentials: 'include' })
      .then((res) => res.text())
      .then((t) => {
        if (!cancelled) setText(t);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return <pre>{text}</pre>;
}

export function SlideshowViewer({ topicId, files, slideIndex, participantToken }: SlideshowViewerProps) {
  const slides = files.filter((f) => !f.is_generated);
  const current = slides[slideIndex];

  if (!current) {
    return (
      <div className="slideshow-viewer">
        <p className="slideshow-empty">No reference material for this topic yet.</p>
      </div>
    );
  }

  const url = fileApi.rawUrl(topicId, current.id, participantToken);

  return (
    <div className="slideshow-viewer">
      {current.kind === 'image' && <img src={url} alt={current.original_filename} />}
      {current.kind === 'pdf' && <iframe src={url} title={current.original_filename} />}
      {(current.kind === 'text' || current.kind === 'markdown') && <TextSlide url={url} />}
      {current.kind === 'other' && (
        <a href={url} target="_blank" rel="noreferrer">
          Download {current.original_filename}
        </a>
      )}
    </div>
  );
}
