<script setup lang="ts">
import { computed, ref } from "vue";
import { useApp } from "../composables/useApp";
import { useConnectionForm } from "../composables/useConnectionForm";
import { useDashboardDrag } from "../composables/useDashboardDrag";
import { alphabeticalIds } from "../dashboard";
import type { ConnectionEntry, ConnectionGroup } from "../types";
import ConnectionGroupCard from "../components/ConnectionGroupCard.vue";
import ConnectionRow from "../components/ConnectionRow.vue";

const DRAFT_GROUP: ConnectionGroup = {
  id: "__draft__",
  name: "",
  expanded: true,
  headerColor: "#16323c",
  connections: [],
};

type DashboardEntry =
  | { kind: "group"; id: string; group: ConnectionGroup }
  | { kind: "connection"; id: string; connection: ConnectionEntry };

const {
  groups,
  standaloneConnections,
  dashboardIds,
  setAllGroupsExpanded,
  reorderDashboard,
  moveConnection,
  showToast,
} = useApp();
const { openNewConnection } = useConnectionForm();
const creating = ref(false);

const groupById = computed(() => new Map(groups.value.map((group) => [group.id, group])));
const connectionById = computed(() => {
  const entries = [
    ...standaloneConnections.value,
    ...groups.value.flatMap((group) => group.connections),
  ];
  return new Map(entries.map((entry) => [entry.id, entry]));
});

const drag = useDashboardDrag({
  layout: () => ({
    root: [...dashboardIds.value],
    groups: Object.fromEntries(
      groups.value.map((group) => [group.id, group.connections.map((entry) => entry.id)]),
    ),
  }),
  itemSelector: "[data-connection-id]",
  itemKey: "connectionId",
  isCollapsed: (groupId) => !groupById.value.get(groupId)?.expanded,
  commitRoot: reorderDashboard,
  commitGroup: moveConnection,
  onError: (err) => showToast(String(err), "error"),
});

const entries = computed(() =>
  drag.rootIds(dashboardIds.value).flatMap((id): DashboardEntry[] => {
    const group = groupById.value.get(id);
    if (group) {
      return [{ kind: "group", id, group }];
    }
    const connection = connectionById.value.get(id);
    return connection ? [{ kind: "connection", id, connection }] : [];
  }),
);
const topLevelConnectionIds = computed(() =>
  entries.value.filter((entry) => entry.kind === "connection").map((entry) => entry.id),
);

function groupConnections(group: ConnectionGroup) {
  const ids = drag.groupItemIds(group.id);
  if (!ids) {
    return group.connections;
  }
  return ids.flatMap((id) => {
    const entry = connectionById.value.get(id);
    return entry ? [entry] : [];
  });
}

const isEmpty = computed(() => !dashboardIds.value.length);
const hasGroups = computed(() => groups.value.length > 0);
const canExpandAll = computed(() => groups.value.some((group) => !group.expanded));
const canCollapseAll = computed(() => groups.value.some((group) => group.expanded));
const canSortEntries = computed(() => dashboardIds.value.length > 1);
const canDragConnections = computed(() => hasGroups.value || canSortEntries.value);

const alphaIds = computed(() =>
  alphabeticalIds([...groups.value, ...standaloneConnections.value]),
);
const canSortAlpha = computed(
  () => canSortEntries.value && alphaIds.value.join("\0") !== dashboardIds.value.join("\0"),
);

async function sortAlphabetically() {
  if (!canSortAlpha.value) {
    return;
  }
  try {
    await reorderDashboard(alphaIds.value);
  } catch (err) {
    showToast(String(err), "error");
  }
}
</script>

<template>
  <div class="groups-page">
    <div class="groups-inner">
      <div class="groups-header">
        <div class="brand">
          <img class="brand-icon" src="/app-icon.png" alt="" width="72" height="72" />
          Recon
        </div>
      </div>

      <div class="groups-display">
        <div class="groups-toolbar">
          <div class="toolbar-start">
            <button class="primary" type="button" @click="openNewConnection(null)">
              New connection
            </button>
            <button class="ghost" type="button" :disabled="creating" @click="creating = true">
              New group
            </button>
          </div>
          <div class="toolbar-end">
            <button
              v-if="hasGroups"
              class="ghost"
              type="button"
              :disabled="!canExpandAll"
              @click="setAllGroupsExpanded(true)"
            >
              <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19.5 5.25 12 12.75 4.5 5.25m15 6L12 18.75l-7.5-7.5" />
              </svg>
              Expand
            </button>
            <button
              v-if="hasGroups"
              class="ghost"
              type="button"
              :disabled="!canCollapseAll"
              @click="setAllGroupsExpanded(false)"
            >
              <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m4.5 18.75 7.5-7.5 7.5 7.5m-15-6 7.5-7.5 7.5 7.5" />
              </svg>
              Collapse
            </button>
            <button class="ghost" type="button" :disabled="!canSortAlpha" @click="sortAlphabetically">
              Sort A–Z
            </button>
          </div>
        </div>

        <p v-if="isEmpty && !creating" class="muted">
          Add a MySQL, PostgreSQL, or SQLite connection. Groups keep related connections together.
        </p>

        <div
          class="groups-list"
          data-dashboard-root
          :class="{ reordering: Boolean(drag.draggingGroupId.value) }"
        >
          <ConnectionGroupCard
            v-if="creating"
            :group="DRAFT_GROUP"
            draft
            @cancel="creating = false"
            @created="creating = false"
          />
          <template v-for="entry in entries" :key="entry.id">
            <ConnectionGroupCard
              v-if="entry.kind === 'group'"
              :data-dashboard-id="entry.id"
              :group="entry.group"
              :sortable="canSortEntries"
              :dragging="drag.draggingGroupId.value === entry.id"
              :connections="groupConnections(entry.group)"
              :connections-sortable="canDragConnections"
              :dragging-connection-id="drag.draggingItemId.value"
              :drop-target="drag.dropGroupId.value === entry.id"
              @reorder-start="(event, id) => drag.start(event, 'group', id)"
              @connection-drag-start="(event, id) => drag.start(event, 'item', id)"
            />
            <ConnectionRow
              v-else
              :data-dashboard-id="entry.id"
              :connection="entry.connection"
              :group-id="null"
              :sibling-ids="topLevelConnectionIds"
              flush
              :sortable="canDragConnections"
              :dragging="drag.draggingItemId.value === entry.id"
              @reorder-start="(event, id) => drag.start(event, 'item', id)"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
