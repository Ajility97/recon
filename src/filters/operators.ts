import type { DatePeriod, DateUnit, FilterKind, FilterOperator, FilterValue } from "./model";

export type ValueEditor = "none" | "single" | "range" | "list" | "lastN" | "period";

const EDITORS: Record<FilterOperator, ValueEditor> = {
  eq: "single",
  neq: "single",
  contains: "single",
  notContains: "single",
  startsWith: "single",
  endsWith: "single",
  gt: "single",
  gte: "single",
  lt: "single",
  lte: "single",
  between: "range",
  notBetween: "range",
  in: "list",
  notIn: "list",
  isNull: "none",
  isNotNull: "none",
  isTrue: "none",
  isFalse: "none",
  isEmpty: "none",
  isNotEmpty: "none",
  inLast: "lastN",
  inPeriod: "period",
};

const NULLS: FilterOperator[] = ["isNull", "isNotNull"];
const TEXT: FilterOperator[] = [
  "eq", "neq", "contains", "notContains", "startsWith", "endsWith", "in", "notIn", "isEmpty", "isNotEmpty", ...NULLS,
];
const EXACT: FilterOperator[] = ["eq", "neq", "in", "notIn", ...NULLS];
const NUMBER: FilterOperator[] = ["eq", "neq", "gt", "gte", "lt", "lte", "between", "notBetween", "in", "notIn", ...NULLS];
const DATE: FilterOperator[] = ["eq", "lt", "gt", "lte", "gte", "between", "inLast", "inPeriod", ...NULLS];

export const KIND_OPERATORS: Record<FilterKind, FilterOperator[]> = {
  text: TEXT,
  other: TEXT,
  enum: EXACT,
  uuid: EXACT,
  number: NUMBER,
  date: DATE,
  datetime: DATE,
  time: ["eq", "lt", "gt", "between", ...NULLS],
  boolean: ["isTrue", "isFalse", ...NULLS],
  json: ["contains", "notContains", ...NULLS],
  binary: NULLS,
};

export const DEFAULT_OPERATOR: Record<FilterKind, FilterOperator> = {
  text: "eq",
  other: "eq",
  enum: "eq",
  uuid: "eq",
  number: "eq",
  date: "eq",
  datetime: "eq",
  time: "eq",
  boolean: "isTrue",
  json: "contains",
  binary: "isNull",
};

const WORDS: Record<FilterOperator, string> = {
  eq: "is",
  neq: "is not",
  contains: "contains",
  notContains: "does not contain",
  startsWith: "starts with",
  endsWith: "ends with",
  gt: "is greater than",
  gte: "is at least",
  lt: "is less than",
  lte: "is at most",
  between: "is between",
  notBetween: "is not between",
  in: "is any of",
  notIn: "is none of",
  isNull: "is NULL",
  isNotNull: "is not NULL",
  isTrue: "is true",
  isFalse: "is false",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
  inLast: "is in the last",
  inPeriod: "is within",
};

const NUMBER_LABELS: Partial<Record<FilterOperator, [symbol: string, words: string]>> = {
  eq: ["=", "equals"],
  neq: ["≠", "does not equal"],
  gt: [">", "greater than"],
  gte: ["≥", "greater than or equal"],
  lt: ["<", "less than"],
  lte: ["≤", "less than or equal"],
};

const DATE_WORDS: Partial<Record<FilterOperator, string>> = {
  eq: "is on",
  lt: "is before",
  gt: "is after",
  lte: "is on or before",
  gte: "is on or after",
};

const TIME_WORDS: Partial<Record<FilterOperator, string>> = {
  eq: "is",
  lt: "is before",
  gt: "is after",
};

const HELP: Partial<Record<FilterOperator, string>> = {
  neq: "Rows where this column is NULL are not included.",
  notContains: "Rows where this column is NULL are not included.",
  notIn: "Rows where this column is NULL are not included.",
  notBetween: "Rows where this column is NULL are not included.",
  contains: "Ignores letter case.",
  startsWith: "Ignores letter case.",
  endsWith: "Ignores letter case.",
  inLast: "Counts today as the last day.",
  isEmpty: "Matches an empty string (''), which is different from NULL.",
  isNotEmpty: "Matches any text except an empty string. Rows where this column is NULL are not included.",
};

export function editorFor(operator: FilterOperator): ValueEditor {
  return EDITORS[operator];
}

export function operatorsFor(kind: FilterKind, nullable = true): FilterOperator[] {
  const list = KIND_OPERATORS[kind];
  return nullable ? list : list.filter((operator) => !NULLS.includes(operator));
}

export function isAllowed(kind: FilterKind, operator: FilterOperator) {
  return KIND_OPERATORS[kind].includes(operator);
}

/** The label in the operator menu, such as `> greater than`. */
export function operatorLabel(kind: FilterKind, operator: FilterOperator): string {
  if (kind === "number" && NUMBER_LABELS[operator]) {
    const [symbol, words] = NUMBER_LABELS[operator];
    return `${symbol}  ${words}`;
  }
  return operatorShort(kind, operator);
}

/** The label inside a sentence, such as `amount > 100` or `created_at is on 2026-09-27`. */
export function operatorShort(kind: FilterKind, operator: FilterOperator): string {
  if (kind === "number" && NUMBER_LABELS[operator]) {
    return NUMBER_LABELS[operator][0];
  }
  if ((kind === "date" || kind === "datetime") && DATE_WORDS[operator]) {
    return DATE_WORDS[operator];
  }
  if (kind === "time" && TIME_WORDS[operator]) {
    return TIME_WORDS[operator];
  }
  return WORDS[operator];
}

export function operatorHelp(operator: FilterOperator): string | undefined {
  return HELP[operator];
}

export const UNIT_LABELS: Record<DateUnit, [one: string, many: string]> = {
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
  year: ["year", "years"],
};

export const PERIOD_LABELS: Record<DatePeriod, string> = {
  thisWeek: "this week",
  lastWeek: "last week",
  thisMonth: "this month",
  lastMonth: "last month",
  thisYear: "this year",
  lastYear: "last year",
};

export const KIND_BADGES: Record<FilterKind, string> = {
  text: "abc",
  other: "abc",
  enum: "enum",
  uuid: "uuid",
  number: "123",
  date: "date",
  datetime: "date",
  time: "time",
  boolean: "bool",
  json: "json",
  binary: "bin",
};

function firstText(value: FilterValue): string {
  switch (value.type) {
    case "single":
      return typeof value.value === "string" ? value.value : "";
    case "range":
      return typeof value.from === "string" ? value.from : "";
    case "list":
      return value.values[0] ?? "";
    default:
      return "";
  }
}

/** Carries what the user already entered into the shape the new operator needs. */
export function convertValue(value: FilterValue, operator: FilterOperator): FilterValue {
  const editor = editorFor(operator);
  if (editor === value.type) {
    return value;
  }
  switch (editor) {
    case "none":
      return { type: "none" };
    case "single":
      return { type: "single", value: value.type === "single" ? value.value : value.type === "range" ? value.from : firstText(value) };
    case "range":
      return { type: "range", from: value.type === "single" ? value.value : firstText(value), to: "" };
    case "list": {
      const text = firstText(value);
      return { type: "list", values: text ? [text] : [] };
    }
    case "lastN":
      return { type: "lastN", amount: 7, unit: "day" };
    case "period":
      return { type: "period", period: "thisMonth" };
  }
}
