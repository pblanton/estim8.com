import { JOIN_CODE_MAX_LENGTH, normalizeJoinCode, validateJoinCode } from '@estim8/shared';

interface JoinCodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Show the extra caution for sessions that will have uploaded documents. */
  warnAboutDocuments?: boolean;
}

/** Optional custom join code input with live validation and a preview of the join link. */
export function JoinCodeField({ value, onChange, warnAboutDocuments }: JoinCodeFieldProps) {
  const problem = value.trim() ? validateJoinCode(value) : null;

  return (
    <div className="form-field">
      <label htmlFor="joinCode">Custom join code (optional)</label>
      <input
        id="joinCode"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Nick — leave blank for a random code"
        maxLength={JOIN_CODE_MAX_LENGTH}
        autoComplete="off"
        autoCapitalize="off"
      />
      {value.trim() && !problem && (
        <div className="field-hint">
          Players join at {window.location.origin}/join/{normalizeJoinCode(value)}
        </div>
      )}
      {problem && <div className="form-error">{problem}</div>}
      {warnAboutDocuments && (
        <div className="field-hint">
          Custom codes are easier to guess than random ones. Anyone who guesses the code can join and see this
          session's documents, so stick with a random code if you'll upload anything sensitive.
        </div>
      )}
    </div>
  );
}
