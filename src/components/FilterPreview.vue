<script setup lang="ts">
import type { FilterPreviewGroup } from "../filters/compile";
import { KIND_BADGES } from "../filters/operators";

defineProps<{
  group: FilterPreviewGroup;
}>();
</script>

<template>
  <div class="filter-preview-group">
    <div
      v-for="(child, index) in group.children"
      :key="child.id"
      class="filter-preview-row"
      :class="{ nested: child.kind === 'group' }"
    >
      <span class="filter-connector">
        {{ index === 0 ? "Where" : group.match === "all" ? "and" : "or" }}
      </span>
      <template v-if="child.kind === 'condition'">
        <span class="filter-preview-field filter-preview-column">
          <span class="filter-column-name">{{ child.column }}</span>
          <span class="filter-kind">{{ KIND_BADGES[child.columnKind] }}</span>
        </span>
        <span class="filter-preview-field">{{ child.operator }}</span>
        <span v-if="child.value" class="filter-preview-field">
          <span class="filter-preview-value">{{ child.value }}</span>
        </span>
      </template>
      <div v-else class="filter-subgroup-card">
        <FilterPreview :group="child" />
      </div>
    </div>
  </div>
</template>
