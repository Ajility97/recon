import { onUnmounted, watch, type WatchSource } from "vue";

export interface PopoverPosition {
  left: number;
  top: number;
}

const MARGIN = 4;

/** Places a popover under `anchor`, or above it when there isn't room below, inside the window. */
export function placePopover(anchor: DOMRect, popover: HTMLElement | null, gap = 4): PopoverPosition {
  const width = popover?.offsetWidth ?? 0;
  const height = popover?.offsetHeight ?? 0;
  const below = anchor.bottom + gap;
  const top = below + height > window.innerHeight - MARGIN && anchor.top - gap - height > MARGIN
    ? anchor.top - gap - height
    : below;
  return {
    left: Math.max(MARGIN, Math.min(anchor.left, window.innerWidth - width - MARGIN)),
    top: Math.max(MARGIN, Math.min(top, window.innerHeight - height - MARGIN)),
  };
}

/** Places a menu at the pointer, kept inside the window. */
export function placeAtPoint(x: number, y: number, popover: HTMLElement | null): PopoverPosition {
  const width = popover?.offsetWidth ?? 0;
  const height = popover?.offsetHeight ?? 0;
  return {
    left: Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN)),
    top: Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN)),
  };
}

/**
 * Closes a popover on a click outside `inside()`, on Escape, and when the
 * window loses focus or resizes. Escape is stopped so it doesn't also close
 * whatever holds the popover.
 */
export function useDismiss(
  open: WatchSource<boolean>,
  inside: () => (Element | null | undefined)[],
  close: () => void,
) {
  function onPointerDown(event: PointerEvent) {
    const target = event.target;
    if (target instanceof Node && inside().some((element) => element?.contains(target))) {
      return;
    }
    close();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopImmediatePropagation();
      event.preventDefault();
      close();
    }
  }

  function listen() {
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeydown, true);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
  }

  function unlisten() {
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeydown, true);
    window.removeEventListener("blur", close);
    window.removeEventListener("resize", close);
  }

  watch(open, (value) => (value ? listen() : unlisten()), { immediate: true });
  onUnmounted(unlisten);
}
