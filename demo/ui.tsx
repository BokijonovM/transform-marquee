import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as I from "./icons";

/** Copies text and reports success for the next 1.5s. */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, []);
  return { copied, copy };
}

export function CopyButton(props: { text: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button type="button" className="copy" data-done={copied || undefined} onClick={() => copy(props.text)}>
      {copied ? <I.Tick /> : <I.Copy />}
      <span aria-live="polite">{copied ? "Copied" : props.label ?? "Copy"}</span>
    </button>
  );
}

export function Range(props: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (value: number) => string;
  hint?: ReactNode;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const fill = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <div className="field range">
      <div className="field-head">
        <label htmlFor={id}>{props.label}</label>
        <output htmlFor={id}>{props.format ? props.format(props.value) : props.value}</output>
      </div>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      {props.hint && <p className="field-hint">{props.hint}</p>}
    </div>
  );
}

export function Segmented<T extends string | number>(props: {
  label: string;
  hideLabel?: boolean;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={`field ${props.className ?? ""}`}>
      <legend className={props.hideLabel ? "sr-only" : undefined}>{props.label}</legend>
      <div className="seg">
        {props.options.map((option) => (
          <label key={String(option.value)}>
            <input
              type="radio"
              name={name}
              checked={option.value === props.value}
              onChange={() => props.onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Switch(props: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="switch">
      <span>{props.label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

const TOKEN =
  /(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(?<![\w.-])(import|from|const|export|function|return)(?![\w-])|(<\/?[A-Za-z][\w.]*|\/?>)|(--[\w-]+|[\w-]+(?==)|[\w-]+(?=:\s))|(#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|%)?)/g;
const TOKEN_CLASS = ["com", "str", "kw", "tag", "attr", "num"];

/** A deliberately small highlighter: enough for the JSX and CSS shown here. */
function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) out.push(code.slice(last, index));
    const group = match.slice(1).findIndex((part) => part !== undefined);
    out.push(
      <span key={index} className={`t-${TOKEN_CLASS[group]}`}>
        {match[0]}
      </span>,
    );
    last = index + match[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeBlock(props: { title: string; code: string }) {
  return (
    <figure className="code">
      <figcaption>
        <span>{props.title}</span>
        <CopyButton text={props.code} label="Copy code" />
      </figcaption>
      <pre tabIndex={0}>
        <code>{highlight(props.code)}</code>
      </pre>
    </figure>
  );
}
