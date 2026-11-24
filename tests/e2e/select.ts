import type { Page } from "@playwright/test";

/** Pick an option from an <AppSelect> (custom combobox) by its visible label. */
export async function chooseOption(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
