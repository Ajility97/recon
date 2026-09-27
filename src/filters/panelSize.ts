import { ref } from "vue";

const STORAGE_KEY = "recon.filterPanelFraction";

export const PANEL_FRACTION_DEFAULT = 0.3;
export const PANEL_FRACTION_MIN = 0.15;
export const PANEL_FRACTION_MAX = 0.6;

function clampFraction(value: number) {
  return Math.min(Math.max(value, PANEL_FRACTION_MIN), PANEL_FRACTION_MAX);
}

function read() {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? clampFraction(stored) : PANEL_FRACTION_DEFAULT;
}

/** How much of the table view the filter panel may grow to before it scrolls, shared by every tab. */
export const panelFraction = ref(read());

export function previewPanelFraction(value: number) {
  panelFraction.value = clampFraction(value);
}

export function savePanelFraction(value = panelFraction.value) {
  panelFraction.value = clampFraction(value);
  localStorage.setItem(STORAGE_KEY, String(Math.round(panelFraction.value * 1000) / 1000));
}
