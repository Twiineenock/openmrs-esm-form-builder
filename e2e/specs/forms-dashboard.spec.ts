import { test } from '../core';
import { expect } from '@playwright/test';
import { FormBuilderPage } from '../pages';
import { createForm, createValueReference, addFormResources, deleteForm } from '../commands/form-operations';
import type { Form } from '@types';

let form: Form = null;
test.beforeEach(async ({ api }) => {
  form = await createForm(api, false);
  const valueReference = await createValueReference(api);
  await addFormResources(api, valueReference, form.uuid);
});

test('Filter forms based on publish status', async ({ page }) => {
  const formBuilderPage = new FormBuilderPage(page);

  await test.step('When I visit the form builder', async () => {
    await formBuilderPage.gotoFormBuilder();
  });

  // Test the filter functionality
  await test.step('Then I click the filter dropdown', async () => {
    await formBuilderPage.page.getByRole('combobox', { name: /Filter by:/i }).click();
  });

  await test.step('And I click the Unpublished option', async () =>
    await formBuilderPage.page.getByText(/Unpublished/i).click());

  // Expect the list of forms to not have any published forms
  await expect(
    formBuilderPage.page.getByRole('table').filter({ has: formBuilderPage.page.getByTestId(/yes-tag/i) }),
  ).toHaveCount(0);
});

test('Search forms by name', async ({ page }) => {
  const formBuilderPage = new FormBuilderPage(page);
  await test.step('When I visit the form builder', async () => {
    await formBuilderPage.gotoFormBuilder();
  });

  await test.step('Then I click the `Search` button', async () => {
    await page.getByPlaceholder('Search this list').click();
  });

  await test.step('And I type `A sample test form` into it', async () =>
    await page.getByPlaceholder('Search this list').fill('a sample test form'));

  const formNameElement = page.locator('tr:nth-child(1) > td').nth(0);
  const innerNameText = await formNameElement.innerText();

  await test.step('Then the forms list should show only the forms with the text `a sample test form` in their name', () => {
    expect(innerNameText).toContain('A sample test form');
  });
});

test('Clicking on a form should navigate me to the editor', async ({ page }) => {
  const formBuilderPage = new FormBuilderPage(page);

  await test.step('When I visit the form builder', async () => {
    await formBuilderPage.gotoFormBuilder();
  });

  await test.step('And I click the `A sample test form` form', async () => {
    await formBuilderPage.page.locator(`a[href*="${form.uuid}"]`).click();
  });

  await test.step('Then I should be navigated to the editor page', async () => {
    await expect(page).toHaveURL(new RegExp('form-builder/edit/' + form.uuid));
  });
});

test.afterEach(async ({ api }) => {
  if (form) {
    await deleteForm(api, form.uuid);
  }
});
