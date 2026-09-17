/** Pad (px) so the last tree row can scroll flush to the top of the scroller. */
export function tailPadForTopScroll(scroller: HTMLElement, row: HTMLElement): number {
  return Math.max(0, scroller.clientHeight - row.offsetHeight);
}

/** Instant scroll — focused file becomes the first visible row. Returns bottom pad needed. */
export function scrollAuditFileToTop(scroller: HTMLElement, file: string): number {
  const row = scroller.querySelector(`[data-audit-file="${CSS.escape(file)}"]`);
  if (!(row instanceof HTMLElement)) return 0;

  const scrollerTop = scroller.getBoundingClientRect().top;
  const rowTop = row.getBoundingClientRect().top;
  scroller.scrollTop += rowTop - scrollerTop;

  return tailPadForTopScroll(scroller, row);
}
