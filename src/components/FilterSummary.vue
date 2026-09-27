<script setup lang="ts">
import type { FilterPreviewGroup } from "../filters/compile";

defineProps<{
  group: FilterPreviewGroup;
}>();
</script>

<!-- A filter as one sentence, with column names and values set as code. -->
<template>
  <template v-for="(child, index) in group.children" :key="child.id">
    <template v-if="index > 0">{{ group.match === "all" ? " and " : " or " }}</template>
    <template v-if="child.kind === 'condition'">
      <code class="filter-code">{{ child.column }}</code>{{ ` ${child.shortOperator}${child.value ? " " : ""}`
      }}<code v-if="child.value" class="filter-code">{{ child.value }}</code>
    </template>
    <template v-else>(<FilterSummary :group="child" />)</template>
  </template>
</template>
