"use client";

import { ChangeEvent } from "react";

interface InstagramInputProps {
  value: string;
  onChange: (handle: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
}

/**
 * Instagram handle input with a permanent "@" prefix.
 *
 * The "@" is displayed inside the input as a non-interactive overlay so users
 * know they don't need to type it. Any "@" the user pastes or types is stripped,
 * so the value passed to onChange is always a clean handle string.
 *
 * Instagram handles allow only [a-zA-Z0-9._] and max 30 chars — we enforce
 * maxLength here and let the backend validate the character set.
 */
export function InstagramInput({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "yourhandle",
  maxLength = 30,
  autoFocus = false,
}: InstagramInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Strip any @ the user types/pastes, plus whitespace, so the
    // stored value is always a clean handle.
    const cleaned = e.target.value.replace(/^@+/, "").replace(/\s/g, "");
    onChange(cleaned.slice(0, maxLength));
  };

  return (
    <div className="eb-input-prefix-wrap">
      <span className="eb-input-prefix">@</span>
      <input
        type="text"
        inputMode="text"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="eb-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  );
}
