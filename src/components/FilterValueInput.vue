<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import type { FilterColumn } from "../filters/compile";
import { MAX_LIST_VALUES, type DatePeriod, type DateUnit, type FilterOperator, type FilterScalar, type FilterValue } from "../filters/model";
import { editorFor, PERIOD_LABELS, UNIT_LABELS } from "../filters/operators";
import FilterScalarInput from "./FilterScalarInput.vue";

const props = defineProps<{
  column: FilterColumn;
  operator: FilterOperator;
  value: FilterValue;
  invalid?: boolean;
  suggest?: (search: string) => Promise<string[]>;
}>();

const emit = defineEmits<{
  update: [value: FilterValue, immediate: boolean];
  enter: [];
}>();

const SUGGEST_DELAY = 250;
const SHOWN_TOKENS = 30;

const listId = `filter-suggest-${Math.random().toString(36).slice(2, 10)}`;

const first = ref<InstanceType<typeof FilterScalarInput> | null>(null);
const tokenInput = ref<HTMLInputElement | null>(null);
const amountInput = ref<HTMLInputElement | null>(null);
const periodSelect = ref<HTMLSelectElement | null>(null);
const options = ref<string[]>([]);
const loadingOptions = ref(false);
const tokenDraft = ref("");
const showAllTokens = ref(false);
let suggestTimer = 0;
let suggestRequest = 0;

const editor = computed(() => editorFor(props.operator));
const kind = computed(() => props.column.kind);
const suggestible = computed(
  () =>
    ["text", "enum", "uuid", "other", "number"].includes(kind.value) &&
    (editor.value === "single" || editor.value === "list"),
);
const tokens = computed(() => (props.value.type === "list" ? props.value.values : []));
const visibleTokens = computed(() =>
  showAllTokens.value ? tokens.value : tokens.value.slice(0, SHOWN_TOKENS),
);

function loadSuggestions(search: string) {
  if (!suggestible.value) {
    return;
  }
  window.clearTimeout(suggestTimer);
  if (props.column.enumValues.length) {
    const needle = search.trim().toLowerCase();
    options.value = props.column.enumValues.filter((value) => value.toLowerCase().includes(needle));
    return;
  }
  const suggest = props.suggest;
  if (!suggest) {
    return;
  }
  suggestTimer = window.setTimeout(async () => {
    const id = ++suggestRequest;
    loadingOptions.value = true;
    try {
      const values = await suggest(search);
      if (id === suggestRequest) {
        options.value = values;
      }
    } catch {
      if (id === suggestRequest) {
        options.value = [];
      }
    } finally {
      if (id === suggestRequest) {
        loadingOptions.value = false;
      }
    }
  }, SUGGEST_DELAY);
}

function updateSingle(value: FilterScalar, immediate: boolean) {
  emit("update", { type: "single", value }, immediate);
}

function updateRange(side: "from" | "to", value: FilterScalar, immediate: boolean) {
  if (props.value.type === "range") {
    emit("update", { ...props.value, [side]: value }, immediate);
  }
}

function setTokens(values: string[]) {
  emit("update", { type: "list", values: [...new Set(values)].slice(0, MAX_LIST_VALUES + 1) }, true);
}

function splitTokens(text: string) {
  return text.split(/[\n,\t]+/).map((item) => item.trim()).filter(Boolean);
}

function commitToken() {
  const added = splitTokens(tokenDraft.value);
  tokenDraft.value = "";
  if (added.length) {
    setTokens([...tokens.value, ...added]);
  }
}

function removeToken(index: number) {
  setTokens(tokens.value.filter((_, position) => position !== index));
  void nextTick(() => tokenInput.value?.focus());
}

function onTokenKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    // A highlighted suggestion commits through onTokenInput before this runs.
    window.setTimeout(() => {
      if (tokenDraft.value.trim()) {
        commitToken();
      } else {
        emit("enter");
      }
    });
  } else if (event.key === ",") {
    event.preventDefault();
    commitToken();
  } else if (event.key === "Backspace" && !tokenDraft.value && tokens.value.length) {
    event.preventDefault();
    removeToken(tokens.value.length - 1);
  }
}

function onTokenInput(event: Event) {
  const inputType = (event as InputEvent).inputType;
  if ((inputType === undefined || inputType === "insertReplacementText") && tokenDraft.value.trim()) {
    commitToken();
    return;
  }
  loadSuggestions(tokenDraft.value);
}

function onTokenPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text") ?? "";
  if (!/[\n,\t]/.test(text)) {
    return;
  }
  event.preventDefault();
  setTokens([...tokens.value, ...splitTokens(`${tokenDraft.value}${text}`)]);
  tokenDraft.value = "";
}

function updateAmount(event: Event) {
  if (props.value.type !== "lastN") {
    return;
  }
  const amount = Number((event.target as HTMLInputElement).value);
  emit("update", { ...props.value, amount: Number.isFinite(amount) ? amount : 0 }, false);
}

function updateUnit(event: Event) {
  if (props.value.type === "lastN") {
    emit("update", { ...props.value, unit: (event.target as HTMLSelectElement).value as DateUnit }, true);
  }
}

function updatePeriod(event: Event) {
  emit("update", { type: "period", period: (event.target as HTMLSelectElement).value as DatePeriod }, true);
}

function focus() {
  if (editor.value === "list") {
    tokenInput.value?.focus();
  } else if (editor.value === "lastN") {
    amountInput.value?.select();
  } else if (editor.value === "period") {
    periodSelect.value?.focus();
  } else {
    first.value?.focus();
  }
}

onBeforeUnmount(() => window.clearTimeout(suggestTimer));

defineExpose({ focus });
</script>

<template>
  <div class="filter-value" :class="{ invalid }">
    <FilterScalarInput
      v-if="value.type === 'single'"
      ref="first"
      :kind="kind"
      :model-value="value.value"
      :list-id="suggestible ? listId : undefined"
      :invalid="invalid"
      :label="`${column.name} value`"
      @update="updateSingle"
      @enter="emit('enter')"
      @focusin="loadSuggestions(typeof value.value === 'string' ? value.value : '')"
      @search="loadSuggestions"
    />
    <template v-else-if="value.type === 'range'">
      <FilterScalarInput
        ref="first"
        :kind="kind"
        :model-value="value.from"
        :invalid="invalid"
        :label="`${column.name} from`"
        placeholder="From"
        @update="(next, immediate) => updateRange('from', next, immediate)"
        @enter="emit('enter')"
      />
      <span class="filter-and muted tiny">and</span>
      <FilterScalarInput
        :kind="kind"
        :model-value="value.to"
        :invalid="invalid"
        :label="`${column.name} to`"
        placeholder="To"
        @update="(next, immediate) => updateRange('to', next, immediate)"
        @enter="emit('enter')"
      />
    </template>
    <div v-else-if="value.type === 'list'" class="filter-tokens" :class="{ invalid }" @click.self="tokenInput?.focus()">
      <span v-for="(token, index) in visibleTokens" :key="`${index}:${token}`" class="filter-token">
        <span class="filter-token-text">{{ token }}</span>
        <button
          class="filter-token-remove"
          type="button"
          :aria-label="`Remove ${token}`"
          @click="removeToken(index)"
        >
          ×
        </button>
      </span>
      <button
        v-if="tokens.length > visibleTokens.length"
        class="filter-token filter-token-more"
        type="button"
        @click="showAllTokens = true"
      >
        +{{ (tokens.length - visibleTokens.length).toLocaleString() }} more
      </button>
      <input
        ref="tokenInput"
        v-model="tokenDraft"
        class="filter-token-input"
        type="text"
        :list="suggestible ? listId : undefined"
        :placeholder="tokens.length ? '' : 'Type a value, then Enter'"
        :aria-label="`${column.name} values`"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        @keydown="onTokenKeydown"
        @input="onTokenInput"
        @paste="onTokenPaste"
        @focus="loadSuggestions(tokenDraft)"
        @blur="commitToken"
      />
    </div>
    <template v-else-if="value.type === 'lastN'">
      <input
        ref="amountInput"
        class="filter-input filter-amount"
        type="number"
        min="1"
        step="1"
        :value="value.amount"
        :aria-label="`Number of ${UNIT_LABELS[value.unit][1]}`"
        @input="updateAmount"
        @keydown.enter.prevent="emit('enter')"
      />
      <select class="filter-select" :value="value.unit" aria-label="Unit" @change="updateUnit">
        <option v-for="(labels, unit) in UNIT_LABELS" :key="unit" :value="unit">
          {{ value.amount === 1 ? labels[0] : labels[1] }}
        </option>
      </select>
    </template>
    <select
      v-else-if="value.type === 'period'"
      ref="periodSelect"
      class="filter-select"
      :value="value.period"
      aria-label="Period"
      @change="updatePeriod"
    >
      <option v-for="(label, period) in PERIOD_LABELS" :key="period" :value="period">{{ label }}</option>
    </select>
    <datalist v-if="suggestible" :id="listId">
      <option v-for="option in options" :key="option" :value="option" />
    </datalist>
    <span v-if="loadingOptions" class="spinner filter-suggest-spinner" aria-label="Loading suggestions" />
  </div>
</template>
