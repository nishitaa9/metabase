import { setupFieldValuesEndpoints } from "__support__/server-mocks";
import { createMockEntitiesState } from "__support__/store";
import { renderWithProviders, screen } from "__support__/ui";
import { getMetadata } from "metabase/selectors/metadata";
import {
  createSampleDatabase,
  PEOPLE,
  PRODUCT_CATEGORY_VALUES,
  PRODUCTS,
} from "metabase-types/api/mocks/presets";
import { createMockState } from "metabase-types/store/mocks";

import CategoryFingerprint from "./CategoryFingerprint";

const state = createMockState({
  entities: createMockEntitiesState({
    databases: [createSampleDatabase()],
  }),
});

function setup({ field }) {
  setupFieldValuesEndpoints(PRODUCT_CATEGORY_VALUES);

  renderWithProviders(<CategoryFingerprint field={field} />, {
    storeInitialState: state,
  });
}

describe("CategoryFingerprint", () => {
  const metadata = getMetadata(state);

  describe("when the field does not have a `has_field_values` value of 'list'", () => {
    const field = metadata.field(PEOPLE.ADDRESS);

    it("should not fetch field values when field values are empty", () => {
      setup({ field });
      expect(
        screen.queryByText("Getting distinct values..."),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/distinct values/)).toBeInTheDocument();
    });
  });

  describe("when the field has a `has_field_values` value of 'list'", () => {
    const field = metadata.field(PRODUCTS.CATEGORY);

    it("should fetch field values when field values are empty", async () => {
      setup({ field });

      expect(
        screen.getByText("Getting distinct values..."),
      ).toBeInTheDocument();
      expect(await screen.findByText("4 distinct values")).toBeInTheDocument();
    });
  });
});
