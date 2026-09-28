<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { FilterColumn } from "../filters/compile";
import { KIND_BADGES } from "../filters/operators";
import { placePopover, useDismiss, type PopoverPosition } from "../composables/usePopover";

const props = defineProps<{
  columns: FilterColumn[];
  modelValue: string;
  autoOpen?: boolean;
  invalid?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [name: string];
  picked: [];
}>();

const button = ref<HTMLButtonElement | null>(null);
const popover = ref<HTMLElement | null>(null);
const search = ref<HTMLInputElement | null>(null);
const list = ref<HTMLElement | null>(null);
const open = ref(false);
const query = ref("");
const highlight = ref(0);
const position = ref<PopoverPosition>({ left: 0, top: 0 });

const current = computed(() => props.columns.find((column) => column.name === props.modelValue));

const matches = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) {
    return props.columns;
  }
  const starts: FilterColumn[] = [];
  const contains: FilterColumn[] = [];
  for (const column of props.columns) {
    const name = column.name.toLowerCase();
    if (name.startsWith(needle)) {
      starts.push(column);
    } else if (name.includes(needle)) {
      contains.push(column);
    }
  }
  return [...starts, ...contains];
});

function place() {
  if (button.value) {
    position.value = placePopover(button.value.getBoundingClientRect(), popover.value);
  }
}

function show(initial = "") {
  query.value = initial;
  const index = props.columns.findIndex((column) => column.name === props.modelValue);
  highlight.value = initial ? 0 : Math.max(index, 0);
  open.value = true;
  void nextTick(() => {
    place();
    search.value?.focus();
    scrollHighlightIntoView();
  });
}

function close(refocus = true) {
  if (!open.value) {
    return;
  }
  open.value = false;
  if (refocus) {
    button.value?.focus();
  }
}

useDismiss(open, () => [popover.value, button.value], () => close());

// Follows the button while the filter panel scrolls, such as when a new row is revealed.
function onScroll(event: Event) {
  if (!(event.target instanceof Node && popover.value?.contains(event.target))) {
    place();
  }
}

watch(open, (value) => {
  if (value) {
    window.addEventListener("scroll", onScroll, true);
  } else {
    window.removeEventListener("scroll", onScroll, true);
  }
});

onBeforeUnmount(() => window.removeEventListener("scroll", onScroll, true));

function pick(column: FilterColumn) {
  open.value = false;
  emit("update:modelValue", column.name);
  emit("picked");
}

function scrollHighlightIntoView() {
  void nextTick(() => {
    list.value?.querySelector<HTMLElement>(".active")?.scrollIntoView({ block: "nearest" });
  });
}

function move(delta: number) {
  if (!matches.value.length) {
    return;
  }
  highlight.value = (highlight.value + delta + matches.value.length) % matches.value.length;
  scrollHighlightIntoView();
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    move(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    move(-1);
  } else if (event.key === "Enter" || (event.key === "Tab" && query.value)) {
    const column = matches.value[highlight.value];
    if (column) {
      event.preventDefault();
      pick(column);
    }
  } else if (event.key === "Tab") {
    close(false);
  }
}

function onButtonKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    show();
  } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    show(event.key);
  }
}

function toggle() {
  if (open.value) {
    close();
  } else {
    show();
  }
}

function onQueryInput() {
  highlight.value = 0;
  void nextTick(place);
}

defineExpose({ focus: () => button.value?.focus(), open: () => show() });

onMounted(() => {
  if (props.autoOpen) {
    show();
  }
});
</script>

<template>
  <button
    ref="button"
    class="filter-column"
    :class="{ empty: !modelValue, invalid }"
    type="button"
    :title="current ? `${current.name} · ${current.dataType}` : modelValue || 'Choose a column'"
    aria-haspopup="listbox"
    :aria-expanded="open"
    @click="toggle"
    @keydown="onButtonKeydown"
  >
    <span class="filter-column-name">{{ modelValue || "Column" }}</span>
    <span v-if="current" class="filter-kind">{{ KIND_BADGES[current.kind] }}</span>
    <svg class="filter-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></svg>
  </button>
  <Teleport to="body">
    <div
      v-if="open"
      ref="popover"
      class="filter-popover column-picker"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <input
        ref="search"
        v-model="query"
        class="column-picker-search"
        type="search"
        placeholder="Find a column"
        spellcheck="false"
        autocomplete="off"
        aria-label="Find a column"
        @input="onQueryInput"
        @keydown="onSearchKeydown"
      />
      <ul ref="list" class="column-picker-list" role="listbox" aria-label="Columns">
        <li
          v-for="(column, index) in matches"
          :key="column.name"
          class="column-picker-item"
          :class="{ active: index === highlight, current: column.name === modelValue }"
          role="option"
          :aria-selected="index === highlight"
          :title="column.dataType"
          @mousedown.prevent="pick(column)"
          @mousemove="highlight = index"
        >
          <span class="column-picker-name">{{ column.name }}</span>
          <span v-if="column.indexed" class="filter-indexed" title="Indexed, so filters on it stay fast on large tables">
            indexed
          </span>
          <span class="filter-kind">{{ KIND_BADGES[column.kind] }}</span>
        </li>
        <li v-if="!matches.length" class="column-picker-empty muted tiny">No matching columns</li>
      </ul>
    </div>
  </Teleport>
</template>
