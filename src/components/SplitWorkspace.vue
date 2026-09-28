<script lang="ts">
export default { name: "SplitWorkspace" };
</script>

<script setup lang="ts">
import { computed } from "vue";
import {
  axisSpan,
  clampDragSizes,
  SPLIT_HANDLE,
  type SplitAxis,
  type SplitNode,
} from "../workspace/split";
import SplitWorkspace from "./SplitWorkspace.vue";

const props = defineProps<{
  node: SplitNode;
  path?: number[];
  focusedPaneId: string;
  flashPaneId?: string;
  paneCount: number;
  dropPaneId?: string;
  dropEdge?: "left" | "right" | "up" | "down" | null;
  dropPreviewTitle?: string;
  dropPreviewFiltered?: boolean;
}>();

defineSlots<{
  default?: (props: { paneId: string }) => unknown;
}>();

const emit = defineEmits<{
  focus: [paneId: string];
  resize: [path: number[], sizes: [number, number]];
  reset: [path: number[]];
}>();

const path = computed(() => props.path ?? []);
const edgePreview = computed(
  () => props.node.type === "leaf" && props.dropPaneId === props.node.paneId && Boolean(props.dropEdge),
);
const previewAxis = computed(() => (props.dropEdge === "left" || props.dropEdge === "right" ? "axis-x" : "axis-y"));
const previewFirst = computed(() => props.dropEdge === "left" || props.dropEdge === "up");

function startResize(event: PointerEvent, axis: SplitAxis) {
  if (props.node.type !== "split" || event.button !== 0) {
    return;
  }
  event.preventDefault();
  const handle = event.currentTarget as HTMLElement;
  const parent = handle.parentElement;
  if (!parent) {
    return;
  }
  handle.setPointerCapture(event.pointerId);
  window.getSelection()?.removeAllRanges();
  const rect = parent.getBoundingClientRect();
  const container = axis === "x" ? rect.width : rect.height;
  const leftSpan = axisSpan(props.node.children[0], axis);
  const rightSpan = axisSpan(props.node.children[1], axis);
  document.body.classList.add(axis === "x" ? "resizing-columns" : "resizing-rows");

  const onMove = (move: PointerEvent) => {
    move.preventDefault();
    const origin = axis === "x" ? rect.left : rect.top;
    const pos = axis === "x" ? move.clientX : move.clientY;
    const available = Math.max(1, container - SPLIT_HANDLE);
    emit("resize", path.value, clampDragSizes(axis, (pos - origin) / available, container, leftSpan, rightSpan));
  };
  let done = false;
  const onUp = () => {
    if (done) {
      return;
    }
    done = true;
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
    handle.removeEventListener("lostpointercapture", onUp);
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    document.body.classList.remove("resizing-columns", "resizing-rows");
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
  handle.addEventListener("lostpointercapture", onUp);
}

function reset() {
  emit("reset", path.value);
}

function containsFocus(child: SplitNode): boolean {
  if (child.type === "leaf") {
    return child.paneId === props.focusedPaneId;
  }
  return containsFocus(child.children[0]) || containsFocus(child.children[1]);
}

function forwardFocus(paneId: string) {
  emit("focus", paneId);
}

function forwardResize(nextPath: number[], sizes: [number, number]) {
  emit("resize", nextPath, sizes);
}

function forwardReset(nextPath: number[]) {
  emit("reset", nextPath);
}
</script>

<template>
  <div v-if="node.type === 'leaf' && edgePreview" class="split-node" :class="previewAxis">
    <div v-if="previewFirst" class="split-child" style="flex: 1 1 0">
      <div
        class="split-leaf split-leaf-preview"
        :data-pane-id="node.paneId"
        :data-drop-edge="dropEdge"
      >
        <div class="subtab-bar" aria-hidden="true">
          <div class="subtab drop-preview">
            <span v-if="dropPreviewFiltered" class="subtab-filter">
              <svg class="subtab-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.5 3h11L9.2 8.2v4.3l-2.4 1.2V8.2L2.5 3Z" />
              </svg>
              <span class="subtab-filter-dot" />
            </span>
            <svg v-else class="subtab-icon" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="3" width="12" height="10" rx="1.5" />
              <path d="M2 6.5h12M6.5 6.5V13" />
            </svg>
            <span class="subtab-title">{{ dropPreviewTitle }}</span>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="previewFirst"
      class="split-sash"
      :class="previewAxis"
      :data-pane-id="node.paneId"
      :data-drop-edge="dropEdge"
    />
    <div class="split-child" style="flex: 1 1 0">
      <div
        class="split-leaf"
        :class="{ focused: focusedPaneId === node.paneId && paneCount > 1 }"
        @pointerdown="emit('focus', node.paneId)"
      >
        <slot :pane-id="node.paneId" />
      </div>
    </div>
    <div
      v-if="!previewFirst"
      class="split-sash"
      :class="previewAxis"
      :data-pane-id="node.paneId"
      :data-drop-edge="dropEdge"
    />
    <div v-if="!previewFirst" class="split-child" style="flex: 1 1 0">
      <div
        class="split-leaf split-leaf-preview"
        :data-pane-id="node.paneId"
        :data-drop-edge="dropEdge"
      >
        <div class="subtab-bar" aria-hidden="true">
          <div class="subtab drop-preview">
            <span v-if="dropPreviewFiltered" class="subtab-filter">
              <svg class="subtab-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.5 3h11L9.2 8.2v4.3l-2.4 1.2V8.2L2.5 3Z" />
              </svg>
              <span class="subtab-filter-dot" />
            </span>
            <svg v-else class="subtab-icon" viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2" y="3" width="12" height="10" rx="1.5" />
              <path d="M2 6.5h12M6.5 6.5V13" />
            </svg>
            <span class="subtab-title">{{ dropPreviewTitle }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    v-else-if="node.type === 'leaf'"
    class="split-leaf"
    :class="{
      focused: focusedPaneId === node.paneId && paneCount > 1,
      flash: flashPaneId === node.paneId,
      'drop-target': dropPaneId === node.paneId && !dropEdge,
    }"
    @pointerdown="emit('focus', node.paneId)"
  >
    <slot :pane-id="node.paneId" />
  </div>
  <div v-else class="split-node" :class="node.axis === 'x' ? 'axis-x' : 'axis-y'">
    <div class="split-child" :class="{ 'has-focus': containsFocus(node.children[0]) }" :style="{ flex: `${node.sizes[0]} 1 0` }">
      <SplitWorkspace
        :node="node.children[0]"
        :path="[...path, 0]"
        :focused-pane-id="focusedPaneId"
        :flash-pane-id="flashPaneId"
        :pane-count="paneCount"
        :drop-pane-id="dropPaneId"
        :drop-edge="dropEdge"
        :drop-preview-title="dropPreviewTitle"
        :drop-preview-filtered="dropPreviewFiltered"
        @focus="forwardFocus"
        @resize="forwardResize"
        @reset="forwardReset"
      >
        <template #default="{ paneId }">
          <slot :pane-id="paneId" />
        </template>
      </SplitWorkspace>
    </div>
    <div
      class="split-sash"
      :class="node.axis === 'x' ? 'axis-x' : 'axis-y'"
      role="separator"
      :aria-orientation="node.axis === 'x' ? 'vertical' : 'horizontal'"
      @pointerdown="startResize($event, node.axis)"
      @dblclick="reset"
    />
    <div class="split-child" :class="{ 'has-focus': containsFocus(node.children[1]) }" :style="{ flex: `${node.sizes[1]} 1 0` }">
      <SplitWorkspace
        :node="node.children[1]"
        :path="[...path, 1]"
        :focused-pane-id="focusedPaneId"
        :flash-pane-id="flashPaneId"
        :pane-count="paneCount"
        :drop-pane-id="dropPaneId"
        :drop-edge="dropEdge"
        :drop-preview-title="dropPreviewTitle"
        :drop-preview-filtered="dropPreviewFiltered"
        @focus="forwardFocus"
        @resize="forwardResize"
        @reset="forwardReset"
      >
        <template #default="{ paneId }">
          <slot :pane-id="paneId" />
        </template>
      </SplitWorkspace>
    </div>
  </div>
</template>
