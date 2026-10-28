import { useState, type FormEvent } from 'react';

interface AddTopicFormProps {
  onAdd: (name: string) => Promise<unknown>;
  placeholder?: string;
  buttonLabel?: string;
}

/** Small inline "add a topic" form used inside the play room (facilitator only). */
export function AddTopicForm({ onAdd, placeholder = 'Add another topic…', buttonLabel = 'Add' }: AddTopicFormProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAdd(trimmed);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="add-topic-form" onSubmit={onSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} maxLength={150} />
      <button className="btn btn-primary btn-small" type="submit" disabled={busy || !name.trim()}>
        {buttonLabel}
      </button>
    </form>
  );
}
