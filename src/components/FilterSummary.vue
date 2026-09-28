<script setup lang="ts">
import type { FilterPreviewGroup } from "../filters/compile";
import { KIND_BADGES } from "../filters/operators";

defineProps<{
  group: FilterPreviewGroup;
}>();
</script>

<!-- A filter on one line, with each part boxed the way the filter panel shows it. -->
<template>
  <template v-for="(child, index) in group.children" :key="child.id">
    <span v-if="index > 0" class="filter-summary-joiner">{{ group.match === "all" ? "and" : "or" }}</span>
    <template v-if="child.kind === 'condition'">
      <span class="filter-summary-field">
        <span class="filter-summary-column">{{ child.column }}</span>
        <span class="filter-kind">{{ KIND_BADGES[child.columnKind] }}</span>
      </span>
      <span class="filter-summary-field">{{ child.shortOperator }}</span>
      <span v-if="child.value" class="filter-summary-field filter-summary-value">{{ child.value }}</span>
    </template>
    <template v-else>
      <span class="filter-summary-joiner">(</span>
      <FilterSummary :group="child" />
      <span class="filter-summary-joiner">)</span>
    </template>
  </template>
</template>
