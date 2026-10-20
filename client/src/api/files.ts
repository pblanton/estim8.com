export interface TopicFile {
  id: string;
  topic_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  size_bytes: number;
  position: number;
  kind: 'image' | 'pdf' | 'text' | 'markdown' | 'other';
  is_generated: boolean;
}

import { api } from './client';

export const fileApi = {
  list: (topicId: string, participantToken?: string) => {
    const qs = participantToken ? `?participantToken=${encodeURIComponent(participantToken)}` : '';
    return api.get<{ files: TopicFile[] }>(`/topics/${topicId}/files${qs}`);
  },
  upload: async (topicId: string, files: FileList): Promise<{ files: TopicFile[] }> => {
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('files', file);
    }
    const res = await fetch(`/api/topics/${topicId}/files`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  remove: (fileId: string) => api.delete<{ ok: true }>(`/topic-files/${fileId}`),
  rawUrl: (topicId: string, fileId: string, participantToken?: string) => {
    const qs = participantToken ? `?participantToken=${encodeURIComponent(participantToken)}` : '';
    return `/api/topics/${topicId}/files/${fileId}/raw${qs}`;
  },
};
