<script setup lang="ts">
import { computed } from "vue";
import type { CompiledFilter, FilterColumn } from "../filters/compile";
import type { FilterCondition, FilterGroup, MatchMode } from "../filters/model";
import FilterRow from "./FilterRow.vue";

const props = defineProps<{
  group: FilterGroup;
  top: boolean;
  columns: FilterColumn[];
  columnMap: Map<string, FilterColumn>;
  compiled: CompiledFilter;
  serverIssues: Map<string, string>;
  autoOpenId: string;
  /** A just-added filter or group, highlighted for a moment. */
  flashId: string;
  suggest?: (column: string, search: string) => Promise<string[]>;
}>();

const emit = defineEmits<{
  change: [node: FilterCondition, immediate: boolean];
  remove: [id: string];
  duplicate: [id: string];
  setMatch: [groupId: string, match: MatchMode];
  add: [groupId: string];
  enter: [];
}>();

/** Conditions that repeat an earlier one in this group, so they can't change the results. */
const duplicates = computed(() => {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const child of props.group.children) {
    if (child.kind !== "condition" || !child.column || !child.enabled) {
      continue;
    }
    const key = JSON.stringify([child.column, child.operator, child.value]);
    if (seen.has(key)) {
      repeated.add(child.id);
    } else {
      seen.add(key);
    }
  }
  return repeated;
});
</script>

<template>
  <div class="filter-group" :class="{ nested: !top }">
    <template v-for="(child, index) in group.children" :key="child.id">
      <FilterRow
        v-if="child.kind === 'condition'"
        :node="child"
        :columns="columns"
        :column="columnMap.get(child.column)"
        :index="index"
        :match="group.match"
        :issue="serverIssues.get(child.id) ?? compiled.issues.get(child.id)"
        :draft="compiled.drafts.has(child.id)"
        :duplicate="duplicates.has(child.id)"
        :auto-open="autoOpenId === child.id"
        :flash="flashId === child.id"
        :suggest="suggest"
        @change="(node, immediate) => emit('change', node, immediate)"
        @remove="emit('remove', child.id)"
        @duplicate="emit('duplicate', child.id)"
        @set-match="(match) => emit('setMatch', group.id, match)"
        @enter="emit('enter')"
      />
      <div v-else class="filter-subgroup">
        <div class="filter-connector">
          <span v-if="index === 0">Where</span>
          <select
            v-else-if="index === 1"
            class="filter-select filter-match"
            :value="group.match"
            aria-label="Match all or any conditions"
            @change="emit('setMatch', group.id, ($event.target as HTMLSelectElement).value as MatchMode)"
          >
            <option value="all">and</option>
            <option value="any">or</option>
          </select>
          <span v-else>{{ group.match === "all" ? "and" : "or" }}</span>
        </div>
        <div class="filter-subgroup-card" :class="{ 'filter-flash': flashId === child.id }" :data-filter-id="child.id">
          <FilterGroupEditor
            :group="child"
            :top="false"
            :columns="columns"
            :column-map="columnMap"
            :compiled="compiled"
            :server-issues="serverIssues"
            :auto-open-id="autoOpenId"
            :flash-id="flashId"
            :suggest="suggest"
            @change="(node, immediate) => emit('change', node, immediate)"
            @remove="(id) => emit('remove', id)"
            @duplicate="(id) => emit('duplicate', id)"
            @set-match="(groupId, match) => emit('setMatch', groupId, match)"
            @add="(groupId) => emit('add', groupId)"
            @enter="emit('enter')"
          />
          <div class="filter-subgroup-footer">
            <button class="ghost tiny" type="button" @click="emit('add', child.id)">+ Add filter to group</button>
            <button class="ghost tiny" type="button" @click="emit('remove', child.id)">Remove group</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
