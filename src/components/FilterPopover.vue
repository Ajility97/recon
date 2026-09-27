<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { FilterPreviewGroup } from "../filters/compile";
import { placePopover, type PopoverPosition } from "../composables/usePopover";
import FilterPreview from "./FilterPreview.vue";

const props = defineProps<{
  preview: FilterPreviewGroup | null;
  count: number;
  /** The element the popover opens under. */
  anchor: DOMRect;
  hint?: string;
}>();

const el = ref<HTMLElement | null>(null);
const position = ref<PopoverPosition>({ left: props.anchor.left, top: props.anchor.bottom + 6 });

function place() {
  void nextTick(() => {
    position.value = placePopover(props.anchor, el.value, 6);
  });
}

onMounted(place);
watch(() => [props.anchor, props.preview], place);
</script>

<!-- The applied filters of a table view, laid out like the filter panel. -->
<template>
  <Teleport to="body">
    <div
      ref="el"
      class="filter-summary-popover"
      role="tooltip"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <div class="filter-summary-popover-title muted tiny">
        {{ count }} {{ count === 1 ? "filter" : "filters" }} applied
      </div>
      <FilterPreview v-if="preview" :group="preview" />
      <div v-if="hint" class="filter-summary-popover-hint muted tiny">{{ hint }}</div>
    </div>
  </Teleport>
</template>
