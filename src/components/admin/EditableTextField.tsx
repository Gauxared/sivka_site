import { ChangeEvent, useEffect, useRef, useState } from 'react';

interface EditableTextFieldProps {
  value: string;
  onCommit: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: string;
  className?: string;
}

export function EditableTextField({ value, onCommit, multiline = false, rows = 2, type = 'text', className }: EditableTextFieldProps) {
  const [draft, setDraft] = useState(value);
  const isFocusedRef = useRef(false);
  const onCommitRef = useRef(onCommit);
  const lastCommittedRef = useRef(value);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDraft(value);
      lastCommittedRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (draft === lastCommittedRef.current) return;

    const timeoutId = window.setTimeout(() => {
      lastCommittedRef.current = draft;
      onCommitRef.current(draft);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [draft]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft(event.target.value);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (draft !== lastCommittedRef.current) {
      lastCommittedRef.current = draft;
      onCommitRef.current(draft);
    }
  };

  const commonProps = {
    className,
    value: draft,
    onChange: handleChange,
    onFocus: () => {
      isFocusedRef.current = true;
    },
    onBlur: handleBlur,
  };

  if (multiline) {
    return <textarea {...commonProps} rows={rows} />;
  }

  return <input {...commonProps} type={type} />;
}
