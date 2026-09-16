'use client';

import { useEffect, useRef, useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { BulletList, LinkIcon, NumberedList, Palette } from './icons';
import { FieldLabel } from './ProductFieldRows';

type RichTextFieldProps = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  /** Suppresses the field's own label row — for a caller (e.g. DescriptionField) that renders its
   * own header alongside extra controls in the same row. */
  hideLabel?: boolean;
  /** Extra control pinned to the right end of the formatting toolbar — e.g. the AI
   * generate/Original/Generated group, which lives in the toolbar rather than a header row. */
  toolbarEnd?: React.ReactNode;
  /** Caps the editable body at its current min height with an inner scrollbar instead of
   * growing the panel — only for Product details (not the New Product wizard / store drafts). */
  fixedHeight?: boolean;
};

type ActiveState = { bold: boolean; italic: boolean; underline: boolean; ul: boolean; ol: boolean };

const NO_ACTIVE: ActiveState = { bold: false, italic: false, underline: false, ul: false, ol: false };

/** Swatch presets for the text-colour popover — a neutral-to-vivid spread, plus a native colour
 * input for anything else. */
const TEXT_COLORS = ['#111827', '#6b7280', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed'];

/**
 * A minimal contentEditable rich-text editor for the Description field — no editor library is
 * installed, so this hand-rolls a small `execCommand` toolbar. `innerHTML` is only pushed in from
 * `value` while the field isn't focused, so an in-progress edit's caret never jumps. The saved
 * HTML is sanitized again server-side before it's persisted.
 *
 * Opening the link modal or the native colour input steals focus away from the contentEditable,
 * which collapses its `Selection` — both save the current `Range` before that happens and restore
 * it immediately before applying the command, so "insert link" / "apply colour" affects whatever
 * was selected when the toolbar button was pressed, not wherever focus happens to land after.
 */
export default function RichTextField({ label, value, onChange, hideLabel, toolbarEnd, fixedHeight }: RichTextFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const savedRange = useRef<Range | null>(null);
  const [active, setActive] = useState<ActiveState>(NO_ACTIVE);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  // The anchor being edited lives in a ref (imperative DOM handle, mutated directly on Save) —
  // `isEditingLink` is the reactive flag that drives the modal's title/footer.
  const editingAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || focused.current) return;
    const next = sanitizeHtml(value);
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value]);

  const refreshActiveState = () => {
    if (!focused.current) {
      setActive(NO_ACTIVE);
      return;
    }
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
    });
  };

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActiveState);
    return () => document.removeEventListener('selectionchange', refreshActiveState);
  }, []);

  useEffect(() => {
    if (!colorOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) setColorOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [colorOpen]);

  const saveSelection = () => {
    const sel = window.getSelection();
    savedRange.current = sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
  };

  /** Falls back to the end of the editor when nothing was selected (e.g. the toolbar button was
   * pressed before the field was ever focused). */
  const getInsertionRange = (): Range | null => {
    if (savedRange.current) return savedRange.current;
    if (!ref.current) return null;
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    range.collapse(false);
    return range;
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    const range = getInsertionRange();
    if (sel && range) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const runCommand = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
    refreshActiveState();
  };

  /** Walks up from `node` to the nearest enclosing `<a>`, stopping at the editor boundary. */
  const findEnclosingAnchor = (node: Node | null): HTMLAnchorElement | null => {
    const root = ref.current;
    if (!node || !root) return null;
    let el: HTMLElement | null = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    while (el && el !== root) {
      if (el.tagName === 'A') return el as HTMLAnchorElement;
      el = el.parentElement;
    }
    return null;
  };

  /** Opens the link modal. With an anchor (clicked directly, or found enclosing the current
   * selection) it edits that link in place; otherwise it inserts a new one around the
   * selection, exactly as before. */
  const openLinkModal = (anchorOverride?: HTMLAnchorElement) => {
    let anchor = anchorOverride ?? null;
    if (!anchor) {
      saveSelection();
      const sel = window.getSelection();
      anchor = sel && ref.current?.contains(sel.anchorNode) ? findEnclosingAnchor(sel.anchorNode) : null;
    } else {
      saveSelection();
    }
    editingAnchorRef.current = anchor;
    setIsEditingLink(!!anchor);
    if (anchor) {
      setLinkUrl(anchor.getAttribute('href') ?? '');
      setLinkText(anchor.textContent ?? '');
    } else {
      const sel = window.getSelection();
      setLinkText(sel && !sel.isCollapsed ? sel.toString() : '');
      setLinkUrl('');
    }
    setLinkModalOpen(true);
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setIsEditingLink(false);
    editingAnchorRef.current = null;
  };

  /** Editing an existing link mutates that anchor in place (no delete/reinsert, so it can't
   * duplicate). Inserting a new one still builds the `<a>` directly via the Range API instead of
   * `execCommand('createLink', ...)`, so its visible text always matches the modal's "Link text"
   * field, whether or not that differs from whatever was originally selected. */
  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url || !ref.current) return;

    const editingAnchor = editingAnchorRef.current;
    if (editingAnchor) {
      editingAnchor.href = url;
      editingAnchor.textContent = linkText.trim() || url;
      onChange(ref.current.innerHTML);
      closeLinkModal();
      return;
    }

    const range = getInsertionRange();
    if (!range) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = linkText.trim() || url;
    range.deleteContents();
    range.insertNode(a);
    range.setStartAfter(a);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    onChange(ref.current.innerHTML);
    closeLinkModal();
  };

  /** Unwraps the anchor being edited back to plain text — only reachable in edit mode. */
  const removeLink = () => {
    const editingAnchor = editingAnchorRef.current;
    if (!editingAnchor || !ref.current) return;
    editingAnchor.replaceWith(document.createTextNode(editingAnchor.textContent ?? ''));
    onChange(ref.current.innerHTML);
    closeLinkModal();
  };

  const applyColor = (hex: string) => {
    if (!ref.current) return;
    ref.current.focus();
    restoreSelection();
    // execCommand's TS typing declares `value` as `string`, but `styleWithCSS` is a boolean flag
    // per spec (and every implementation) — cast rather than pass the wrong runtime type.
    document.execCommand('styleWithCSS', false, true as unknown as string);
    document.execCommand('foreColor', false, hex);
    onChange(ref.current.innerHTML);
    setColorOpen(false);
  };

  return (
    <div className="min-w-0">
      {!hideLabel && <FieldLabel>{label}</FieldLabel>}
      <div className="rounded-lg border border-inventory-border-strong focus-within:border-inventory-primary focus-within:ring-2 focus-within:ring-inventory-primary-ring">
        <div className="flex flex-wrap items-center gap-1 rounded-t-lg border-b border-inventory-border bg-inventory-surface-muted px-1.5 py-0.5">
          <LetterButton letter="B" title="Bold" bold active={active.bold} onClick={() => runCommand('bold')} />
          <LetterButton letter="I" title="Italic" italic active={active.italic} onClick={() => runCommand('italic')} />
          <LetterButton letter="U" title="Underline" underline active={active.underline} onClick={() => runCommand('underline')} />

          <Divider />

          <IconButton title="Bulleted list" active={active.ul} onClick={() => runCommand('insertUnorderedList')}>
            <BulletList className="h-3 w-3" />
          </IconButton>
          <IconButton title="Numbered list" active={active.ol} onClick={() => runCommand('insertOrderedList')}>
            <NumberedList className="h-3 w-3" />
          </IconButton>

          <Divider />

          <IconButton title="Insert link" onMouseDown={openLinkModal} onClick={() => {}}>
            <LinkIcon className="h-3 w-3" />
          </IconButton>

          <div className="relative" ref={colorPopoverRef}>
            <IconButton
              title="Text colour"
              active={colorOpen}
              onMouseDown={saveSelection}
              onClick={() => setColorOpen((v) => !v)}
            >
              <Palette className="h-3 w-3" />
            </IconButton>
            {colorOpen && (
              <div className="absolute z-20 top-full mt-1 left-0 flex w-36 flex-wrap gap-1.5 rounded-lg border border-inventory-border bg-inventory-surface p-2 shadow-lg">
                {TEXT_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyColor(hex)}
                    title={hex}
                    aria-label={`Set text colour to ${hex}`}
                    className="h-5 w-5 rounded-full ring-1 ring-black/10 cursor-pointer"
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <label
                  className="relative flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-inventory-border-strong text-[10px] text-inventory-text-subtle"
                  title="Custom colour"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  +
                  <input
                    type="color"
                    aria-label="Custom text colour"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(e) => applyColor(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
          {toolbarEnd && <span className="ml-auto flex shrink-0 items-center">{toolbarEnd}</span>}
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => {
            focused.current = true;
            refreshActiveState();
          }}
          onBlur={() => {
            focused.current = false;
          }}
          onInput={() => ref.current && onChange(ref.current.innerHTML)}
          onClick={(e) => {
            // Browsers already block navigation on a plain click inside a contentEditable
            // region, so this only ever needs to redirect the click into "edit this link".
            const anchor = (e.target as HTMLElement).closest('a');
            if (anchor && ref.current?.contains(anchor)) {
              e.preventDefault();
              openLinkModal(anchor);
            }
          }}
          aria-label={label}
          className={`min-h-16 w-full px-2.5 py-2 text-[13px] text-inventory-text outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4 [&_a]:text-inventory-secondary [&_a]:underline ${fixedHeight ? 'max-h-16 overflow-y-auto' : ''}`}
        />
      </div>

      {linkModalOpen && (
        <ModalShell disableBackdropClose
          title={isEditingLink ? 'Edit link' : 'Insert link'}
          compact
          onClose={closeLinkModal}
          footer={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeLinkModal}
                className="rounded-lg border border-inventory-border-strong bg-inventory-surface px-3 py-2 text-sm font-semibold text-inventory-text-muted hover:bg-inventory-surface-hover cursor-pointer"
              >
                Cancel
              </button>
              {isEditingLink && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="rounded-lg border border-inventory-border-strong bg-inventory-surface px-3 py-2 text-sm font-semibold text-inventory-danger hover:bg-inventory-danger/10 cursor-pointer"
                >
                  Remove link
                </button>
              )}
              <button
                type="button"
                onClick={applyLink}
                disabled={!linkUrl.trim()}
                className="ml-auto flex-1 rounded-lg bg-inventory-primary px-3 py-2 text-sm font-semibold text-white hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isEditingLink ? 'Save' : 'Insert'}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-inventory-text-subtle">Link text</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Text to display"
                className="w-full rounded-lg border border-inventory-border-strong px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-inventory-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-inventory-text-subtle">URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                className="w-full rounded-lg border border-inventory-border-strong px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-inventory-primary"
              />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-4 w-px shrink-0 bg-inventory-border" aria-hidden="true" />;
}

/** Shared icon-toolbar-button chrome. `onMouseDown` defaults to `preventDefault` (keeps the
 * editor focused and its `Selection` intact when the button is pressed) — pass a custom one only
 * to additionally run side effects (e.g. saving the selection before a focus-stealing popover). */
function IconButton({
  title,
  active,
  onClick,
  onMouseDown,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  onMouseDown?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active ?? false}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown?.();
      }}
      onClick={onClick}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors duration-150 cursor-pointer ${
        active ? 'bg-inventory-secondary/15 text-inventory-secondary' : 'text-inventory-text-muted hover:bg-inventory-surface-hover'
      }`}
    >
      {children}
    </button>
  );
}

/** Bold/italic/underline are rendered as an actual styled letterform (matching how every major
 * editor — Word, Docs, Notion — represents them) rather than a hand-drawn glyph, which is both
 * more legible at 16px and unambiguous at a glance. */
function LetterButton({
  letter,
  title,
  active,
  bold,
  italic,
  underline,
  onClick,
}: {
  letter: string;
  title: string;
  active: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton title={title} active={active} onClick={onClick}>
      <span
        className={`font-serif text-[13px] leading-none ${bold ? 'font-bold' : 'font-normal'} ${italic ? 'italic' : ''} ${underline ? 'underline' : ''}`}
      >
        {letter}
      </span>
    </IconButton>
  );
}
