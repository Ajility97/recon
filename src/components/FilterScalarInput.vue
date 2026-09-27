<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { formatDate } from "../filters/compile";
import type { FilterKind, FilterScalar, RelativeAnchor } from "../filters/model";

const props = defineProps<{
  kind: FilterKind;
  modelValue: FilterScalar;
  listId?: string;
  placeholder?: string;
  invalid?: boolean;
  label: string;
}>();

const emit = defineEmits<{
  update: [value: FilterScalar, immediate: boolean];
  enter: [];
  focusin: [];
  search: [text: string];
}>();

const input = ref<HTMLInputElement | null>(null);

const isDate = computed(() => props.kind === "date" || props.kind === "datetime");
const relative = computed<RelativeAnchor | "">(() =>
  typeof props.modelValue !== "string" && props.modelValue.kind === "relative" ? props.modelValue.anchor : "",
);
const text = computed(() => {
  const value = props.modelValue;
  if (typeof value === "string") {
    return value;
  }
  return value.kind === "absolute" ? value.value : "";
});

const withTime = ref(props.kind === "datetime" && /[ T]\d/.test(text.value));
watch(text, (value) => {
  if (props.kind === "datetime" && /[ T]\d/.test(value)) {
    withTime.value = true;
  }
});

const dateInputValue = computed(() => {
  const value = text.value.trim();
  if (!withTime.value) {
    return value.slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00`;
  }
  return value.replace(" ", "T");
});

function onTextInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const inputType = (event as InputEvent).inputType;
  // Picking a suggestion replaces the text in one step, which should apply right away.
  const picked = inputType === undefined || inputType === "insertReplacementText";
  emit("update", target.value, picked);
  emit("search", target.value);
}

/**
 * Enter first lets the browser commit a highlighted suggestion, which arrives
 * as an input event, and only then asks for the filter to apply.
 */
function onEnter() {
  window.setTimeout(() => emit("enter"));
}

function onDateInput(event: Event) {
  emit("update", (event.target as HTMLInputElement).value, true);
}

function onRelative(event: Event) {
  const anchor = (event.target as HTMLSelectElement).value as RelativeAnchor | "";
  emit("update", anchor ? { kind: "relative", anchor } : formatDate(new Date()), true);
}

function toggleTime() {
  const date = text.value.trim().slice(0, 10);
  withTime.value = !withTime.value;
  if (date) {
    emit("update", withTime.value ? `${date}T00:00` : date, true);
  }
}

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <div class="filter-scalar" :class="{ invalid }">
    <template v-if="isDate">
      <select
        class="filter-select filter-date-mode"
        :value="relative"
        :aria-label="`${label}: exact or relative date`"
        @change="onRelative"
      >
        <option value="">Date</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="tomorrow">Tomorrow</option>
      </select>
      <input
        v-if="!relative"
        ref="input"
        class="filter-input filter-date"
        :type="withTime ? 'datetime-local' : 'date'"
        :value="dateInputValue"
        :aria-label="label"
        @input="onDateInput"
        @keydown.enter="onEnter"
      />
      <button
        v-if="kind === 'datetime' && !relative"
        class="filter-icon-button"
        :class="{ active: withTime }"
        type="button"
        :title="withTime ? 'Match the whole day instead' : 'Match a specific time'"
        :aria-pressed="withTime"
        @click="toggleTime"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 5v3l2 1.5" />
        </svg>
      </button>
    </template>
    <input
      v-else-if="kind === 'time'"
      ref="input"
      class="filter-input filter-time"
      type="time"
      step="1"
      :value="text"
      :aria-label="label"
      @input="onDateInput"
      @keydown.enter="onEnter"
    />
    <input
      v-else
      ref="input"
      class="filter-input"
      type="text"
      :inputmode="kind === 'number' ? 'decimal' : undefined"
      :list="listId"
      :placeholder="placeholder ?? (kind === 'number' ? 'Number' : 'Value')"
      :value="text"
      :aria-label="label"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      @input="onTextInput"
      @focus="emit('focusin')"
      @keydown.enter="onEnter"
    />
  </div>
</template>
