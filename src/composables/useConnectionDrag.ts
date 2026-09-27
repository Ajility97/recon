import { computed, onUnmounted, ref, type Ref } from "vue";
import type { ConnectionEntry, ConnectionGroup } from "../types";

// Group ids are UUIDs, so an empty key can never collide with one.
export const STANDALONE_LIST = "";

type Layout = Record<string, string[]>;

interface ConnectionDragOptions {
  groups: Ref<ConnectionGroup[]>;
  standalone: Ref<ConnectionEntry[]>;
  commit: (connectionId: string, groupId: string | null, connectionIds: string[]) => Promise<void>;
  onError: (err: unknown) => void;
}

function midpointBefore(element: HTMLElement, event: PointerEvent) {
  const rect = element.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2;
}

function locate(layout: Layout, id: string) {
  return Object.keys(layout).find((key) => layout[key].includes(id)) ?? null;
}

function without(layout: Layout, id: string): Layout {
  return Object.fromEntries(
    Object.entries(layout).map(([key, ids]) => [key, ids.filter((item) => item !== id)]),
  );
}

function sameIds(left: string[] | undefined, right: string[] | undefined) {
  return (left ?? []).join("\0") === (right ?? []).join("\0");
}

export function useConnectionDrag(options: ConnectionDragOptions) {
  const draggingId = ref<string | null>(null);
  const draft = ref<Layout | null>(null);
  const sourceKey = ref<string | null>(null);

  const entriesById = computed(() => {
    const entries = [
      ...options.standalone.value,
      ...options.groups.value.flatMap((group) => group.connections),
    ];
    return new Map(entries.map((entry) => [entry.id, entry]));
  });

  const draftKey = computed(() =>
    draft.value && draggingId.value ? locate(draft.value, draggingId.value) : null,
  );

  const dropKey = computed(() =>
    draftKey.value !== null && draftKey.value !== sourceKey.value ? draftKey.value : null,
  );

  const collapsedDrop = computed(() => {
    const key = dropKey.value;
    return key !== null && options.groups.value.some((group) => group.id === key && !group.expanded);
  });

  function savedLayout(): Layout {
    const layout: Layout = {
      [STANDALONE_LIST]: options.standalone.value.map((entry) => entry.id),
    };
    for (const group of options.groups.value) {
      layout[group.id] = group.connections.map((entry) => entry.id);
    }
    return layout;
  }

  function update(next: Layout) {
    const current = draft.value ?? {};
    const changed = Object.keys(next).some((key) => !sameIds(next[key], current[key]));
    if (changed) {
      draft.value = next;
    }
  }

  function moveNear(key: string, targetId: string, before: boolean) {
    const dragging = draggingId.value;
    if (!draft.value || !dragging || dragging === targetId) {
      return;
    }
    const next = without(draft.value, dragging);
    const list = next[key];
    let to = list?.indexOf(targetId) ?? -1;
    if (to === -1) {
      return;
    }
    if (!before) {
      to += 1;
    }
    next[key] = [...list.slice(0, to), dragging, ...list.slice(to)];
    update(next);
  }

  function moveInto(key: string) {
    const dragging = draggingId.value;
    if (!draft.value || !dragging || draft.value[key]?.includes(dragging)) {
      return;
    }
    const next = without(draft.value, dragging);
    if (!next[key]) {
      return;
    }
    next[key] = [...next[key], dragging];
    update(next);
  }

  function onMove(event: PointerEvent) {
    if (!draggingId.value) {
      return;
    }
    const node = document.elementFromPoint(event.clientX, event.clientY);
    if (!(node instanceof Element)) {
      return;
    }
    const row = node.closest("[data-connection-id]");
    if (row instanceof HTMLElement) {
      const id = row.dataset.connectionId;
      const key = row.dataset.connectionList;
      if (id && key !== undefined) {
        moveNear(key, id, midpointBefore(row, event));
      }
      return;
    }
    const zone = node.closest("[data-connection-drop]");
    if (zone instanceof HTMLElement && zone.dataset.connectionDrop !== undefined) {
      moveInto(zone.dataset.connectionDrop);
    }
  }

  function detach() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", finish);
    document.body.classList.remove("reordering-repos");
  }

  async function finish() {
    detach();
    const id = draggingId.value;
    const layout = draft.value;
    const key = draftKey.value;
    const source = sourceKey.value;
    draggingId.value = null;
    draft.value = null;
    sourceKey.value = null;
    if (!id || !layout || key === null) {
      return;
    }
    if (key === source && sameIds(layout[key], savedLayout()[key])) {
      return;
    }
    try {
      await options.commit(id, key === STANDALONE_LIST ? null : key, layout[key]);
    } catch (err) {
      options.onError(err);
    }
  }

  function start(event: PointerEvent, id: string) {
    if (event.button !== 0) {
      return;
    }
    const layout = savedLayout();
    const source = locate(layout, id);
    if (source === null) {
      return;
    }
    event.preventDefault();
    draggingId.value = id;
    draft.value = layout;
    sourceKey.value = source;
    document.body.classList.add("reordering-repos");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  function connectionsFor(key: string, items: ConnectionEntry[]) {
    const ids = draft.value?.[key];
    /*
     * Keep the source list's layout stable while hovering a collapsed group,
     * otherwise its header shifts out from under the pointer.
     */
    if (!ids || (key === sourceKey.value && collapsedDrop.value)) {
      return items;
    }
    return ids.flatMap((id) => {
      const entry = entriesById.value.get(id);
      return entry ? [entry] : [];
    });
  }

  onUnmounted(detach);

  return { draggingId, draftKey, dropKey, start, connectionsFor };
}
