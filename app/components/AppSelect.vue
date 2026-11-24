<script setup lang="ts" generic="T extends string">
/**
 * Styled dropdown built on Reka UI.
 *
 * - Short lists use Reka's `Select` (keyboard nav, typeahead, collision-aware
 *   positioning).
 * - Long lists (or `searchable`) use Reka's `Combobox` with a search box
 *   inside the popup.
 *
 * `class`/`style` go on the wrapper; every other attribute (id, aria-*, …)
 * goes on the trigger button, so `<label for="…">` keeps working.
 */
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from "reka-ui";

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  disabled?: boolean;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    options: readonly SelectOption<T>[];
    placeholder?: string;
    multiple?: boolean;
    /** Show a search box. Defaults to on for lists longer than 10 items. */
    searchable?: boolean;
    variant?: "field" | "pill";
    size?: "md" | "lg";
    invalid?: boolean;
    disabled?: boolean;
  }>(),
  {
    placeholder: "Select…",
    multiple: false,
    searchable: undefined,
    variant: "field",
    size: "md",
    invalid: false,
    disabled: false,
  },
);

const model = defineModel<T | T[]>({ required: true });

const attrs = useAttrs();
const wrapperAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
}));
const triggerAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});

const isSearchable = computed(
  () => props.searchable ?? props.options.length > 10,
);

// Reka reserves "" to mean "no selection", but our filters use "" for
// options like "All categories". Map it to a sentinel internally.
const EMPTY = "__app_select_empty__";
const toInner = (v: T) => (v === "" ? EMPTY : v);
const toOuter = (v: string) => (v === EMPTY ? "" : v) as T;

const innerModel = computed<string | string[]>({
  get: () =>
    Array.isArray(model.value) ? model.value.map(toInner) : toInner(model.value),
  set: (v) => {
    model.value = Array.isArray(v) ? v.map(toOuter) : toOuter(v);
  },
});

const selectedValues = computed<T[]>(() =>
  Array.isArray(model.value) ? model.value : [model.value],
);
const isSelected = (value: T) => selectedValues.value.includes(value);

const displayLabel = computed(() => {
  const labels = props.options
    .filter((o) => isSelected(o.value))
    .map((o) => o.label);
  if (!props.multiple) return labels[0] ?? "";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]} +${labels.length - 1} more`;
});

// ---- combobox (searchable) helpers

const open = ref(false);
const triggerEl = ref<HTMLButtonElement>();
const searchEl = ref<InstanceType<typeof ComboboxInput>>();

function onComboboxTriggerKeydown(e: KeyboardEvent) {
  if (open.value || props.disabled) return;
  const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
  if (e.key === "ArrowDown" || e.key === "ArrowUp" || printable) {
    e.preventDefault();
    triggerEl.value?.click();
    // Typing on the closed trigger starts a search, like a native select.
    if (printable && e.key !== " ") {
      nextTick(() => {
        const input = searchEl.value?.$el as HTMLInputElement | undefined;
        if (!input) return;
        input.value = e.key;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
  }
}

// Return focus to the trigger when the popup closes via Escape or a pick.
watch(open, (isOpen) => {
  if (isOpen) return;
  nextTick(() => {
    const active = document.activeElement;
    if (!active || active === document.body) triggerEl.value?.focus();
  });
});

// ---- styling

const triggerClass = computed(() => [
  "group flex w-full items-center justify-between gap-3 border text-left transition duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  "data-[state=open]:border-gold-500 data-[state=open]:ring-4 data-[state=open]:ring-gold-400/15",
  props.variant === "pill"
    ? "rounded-full bg-white/70 px-4 py-2 text-sm hover:border-gold-500/60"
    : props.size === "lg"
      ? "rounded-xl bg-white/70 px-4 py-3 hover:border-cocoa-900/30"
      : "rounded-xl bg-white px-4 py-2.5 text-sm hover:border-cocoa-900/30",
  props.invalid
    ? "border-red-700/60"
    : "border-cocoa-900/15 focus-visible:border-gold-500",
]);

const panelClass =
  "z-50 flex max-h-(--reka-popper-available-height) min-w-(--reka-popper-anchor-width) max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-2xl border border-cocoa-900/10 bg-white shadow-xl shadow-cocoa-900/10 origin-(--reka-popper-transform-origin) data-[state=open]:animate-dropdown-in data-[state=closed]:animate-dropdown-out";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-cocoa-800 transition-colors duration-150 outline-none select-none data-highlighted:bg-cream-100 data-highlighted:text-cocoa-900 data-disabled:cursor-not-allowed data-disabled:text-cocoa-500/50";
</script>

<template>
  <div class="relative" v-bind="wrapperAttrs">
    <!-- Short lists: Reka Select -->
    <SelectRoot
      v-if="!isSearchable"
      v-model="innerModel"
      :multiple="multiple"
      :disabled="disabled"
    >
      <SelectTrigger
        v-bind="triggerAttrs"
        :aria-invalid="invalid ? 'true' : undefined"
        :class="triggerClass"
      >
        <SelectValue
          class="min-w-0 truncate"
          :class="displayLabel ? 'text-cocoa-900' : 'text-cocoa-500/70'"
        >
          {{ displayLabel || placeholder }}
        </SelectValue>
        <SelectIcon as-child>
          <svg
            class="h-4 w-4 shrink-0 text-cocoa-500 transition-transform duration-300 ease-soft group-hover:text-cocoa-700 group-data-[state=open]:rotate-180 group-data-[state=open]:text-gold-600"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          position="popper"
          :side-offset="6"
          :collision-padding="8"
          :class="panelClass"
        >
          <SelectViewport class="max-h-72 p-1.5">
            <SelectItem
              v-for="o in options"
              :key="o.value"
              :value="toInner(o.value)"
              :disabled="o.disabled"
              :class="[itemClass, isSelected(o.value) && !multiple && 'font-semibold']"
            >
              <span
                v-if="multiple"
                class="grid h-4 w-4 shrink-0 place-items-center rounded border transition"
                :class="
                  isSelected(o.value)
                    ? 'border-cocoa-900 bg-cocoa-900 text-cream-100'
                    : 'border-cocoa-900/25 bg-white'
                "
                aria-hidden="true"
              >
                <svg v-if="isSelected(o.value)" class="h-3 w-3" viewBox="0 0 20 20" fill="none">
                  <path d="m5 10.5 3.2 3L15 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <SelectItemText class="min-w-0 flex-1 truncate">
                {{ o.label }}
              </SelectItemText>
              <svg
                v-if="!multiple && isSelected(o.value)"
                class="h-4 w-4 shrink-0 text-gold-600"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path d="m5 10.5 3.2 3L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>

    <!-- Long lists: Reka Combobox with a search box inside the popup -->
    <ComboboxRoot
      v-else
      v-model="innerModel"
      v-model:open="open"
      :multiple="multiple"
      :disabled="disabled"
      :reset-search-term-on-select="false"
    >
      <ComboboxAnchor as-child>
        <ComboboxTrigger as-child>
          <!-- Our own button so the field's <label> names it (Reka's trigger
               would otherwise be labelled "Show popup" and skip tab order). -->
          <button
            ref="triggerEl"
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            tabindex="0"
            :aria-label="(attrs['aria-label'] as string | undefined)"
            :aria-expanded="open"
            :aria-invalid="invalid ? 'true' : undefined"
            :data-state="open ? 'open' : 'closed'"
            :disabled="disabled"
            :class="triggerClass"
            v-bind="triggerAttrs"
            @keydown="onComboboxTriggerKeydown"
          >
            <span
              class="min-w-0 truncate"
              :class="displayLabel ? 'text-cocoa-900' : 'text-cocoa-500/70'"
            >
              {{ displayLabel || placeholder }}
            </span>
            <svg
              class="h-4 w-4 shrink-0 text-cocoa-500 transition-transform duration-300 ease-soft group-hover:text-cocoa-700 group-data-[state=open]:rotate-180 group-data-[state=open]:text-gold-600"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 7.5 10 12.5 15 7.5"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          position="popper"
          :side-offset="6"
          :collision-padding="8"
          :class="panelClass"
        >
          <div class="border-b border-cocoa-900/10 p-2">
            <div class="relative">
              <svg
                class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cocoa-500"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.6" />
                <path d="m13.5 13.5 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              <ComboboxInput
                ref="searchEl"
                auto-focus
                :display-value="() => ''"
                aria-label="Filter options"
                placeholder="Search…"
                class="w-full rounded-xl bg-cream-100/60 py-2 pr-3 pl-9 text-sm text-cocoa-900 placeholder:text-cocoa-500/60 focus:bg-cream-100 focus:outline-none"
              />
            </div>
          </div>

          <ComboboxViewport class="max-h-72 p-1.5">
            <ComboboxEmpty class="px-3 py-6 text-center text-sm text-cocoa-500">
              No matches
            </ComboboxEmpty>
            <ComboboxItem
              v-for="o in options"
              :key="o.value"
              :value="toInner(o.value)"
              :text-value="o.label"
              :disabled="o.disabled"
              :class="[itemClass, isSelected(o.value) && !multiple && 'font-semibold']"
            >
              <span
                v-if="multiple"
                class="grid h-4 w-4 shrink-0 place-items-center rounded border transition"
                :class="
                  isSelected(o.value)
                    ? 'border-cocoa-900 bg-cocoa-900 text-cream-100'
                    : 'border-cocoa-900/25 bg-white'
                "
                aria-hidden="true"
              >
                <svg v-if="isSelected(o.value)" class="h-3 w-3" viewBox="0 0 20 20" fill="none">
                  <path d="m5 10.5 3.2 3L15 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="min-w-0 flex-1 truncate">{{ o.label }}</span>
              <svg
                v-if="!multiple && isSelected(o.value)"
                class="h-4 w-4 shrink-0 text-gold-600"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path d="m5 10.5 3.2 3L15 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </ComboboxItem>
          </ComboboxViewport>

          <div
            v-if="multiple && selectedValues.length"
            class="flex items-center justify-between border-t border-cocoa-900/10 px-4 py-2 text-xs text-cocoa-500"
          >
            <span>{{ selectedValues.length }} selected</span>
            <button
              type="button"
              class="font-semibold text-cocoa-700 hover:text-gold-600"
              @click="model = []"
            >
              Clear
            </button>
          </div>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </div>
</template>
