import { USERS } from "e2e/support/cypress_data";
import {
  blockSnowplow,
  describeWithSnowplow,
  expectGoodSnowplowEvent,
  expectGoodSnowplowEvents,
  expectNoBadSnowplowEvents,
  main,
  resetSnowplow,
  restore,
} from "e2e/support/helpers";

const { admin } = USERS;

// we're testing for one known (en) and one unknown (xx) locale
const locales = ["en", "xx"];

describe("scenarios > setup", () => {
  locales.forEach(locale => {
    beforeEach(() => restore("blank"));

    it(
      `should allow you to sign up using "${locale}" browser locale`,
      { tags: ["@external"] },
      () => {
        // intial redirection and welcome page
        cy.visit("/", {
          // set the browser language as per:
          // https://glebbahmutov.com/blog/cypress-tips-and-tricks/index.html#control-navigatorlanguage
          onBeforeLoad(win) {
            Object.defineProperty(win.navigator, "language", {
              value: locale,
            });
          },
        });
        cy.location("pathname").should("eq", "/setup");

        skipWelcomePage();

        cy.findByTestId("setup-forms").within(() => {
          selectPreferredLanguageAndContinue();

          // ====
          // User
          // ====

          // "Next" should be disabled on the blank form
          cy.findByRole("button", { name: "Next" }).should("be.disabled");
          cy.findByLabelText("First name").type("Testy");
          cy.findByLabelText("Last name").type("McTestface");
          cy.findByLabelText("Email").type("testy@metabase.test");
          cy.findByLabelText("Company or team name").type("Epic Team");

          // test first with a weak password
          cy.findByLabelText("Create a password").type("password");
          cy.findByLabelText("Confirm your password").type("password");

          // the form shouldn't be valid yet and we should display an error
          cy.findByText("must include one number", { exact: false });
          cy.findByRole("button", { name: "Next" }).should("be.disabled");

          // now try a strong password that doesn't match
          const strongPassword = "QJbHYJN3tPW[";
          cy.findByLabelText(/^Create a password/)
            .clear()
            .type(strongPassword);
          cy.findByLabelText(/^Confirm your password/)
            .clear()
            .type(strongPassword + "foobar")
            .blur();

          // tell the user about the mismatch after clicking "Next"
          cy.findByRole("button", { name: "Next" }).should("be.disabled");
          cy.findByText("passwords do not match", { exact: false });

          // fix that mismatch
          cy.findByLabelText(/^Confirm your password/)
            .clear()
            .type(strongPassword);

          // Submit the first section
          cy.findByText("Next").click();

          // ========
          // Usage question
          // ========

          cy.button("Next").click();

          // ========
          // Database
          // ========

          // The database step should be open
          cy.findByText("Add your data");

          // test database setup help card is NOT displayed before DB is selected
          cy.findByText("Need help connecting?").should("not.be.visible");

          // test that you can return to user settings if you want
          cy.findByText("Hi, Testy. Nice to meet you!").click();
          cy.findByLabelText("Email").should(
            "have.value",
            "testy@metabase.test",
          );

          // test database setup help card is NOT displayed on other steps
          cy.findByText("Need help connecting?").should("not.be.visible");

          // now back to database setting
          cy.button("Next").click();
          cy.button("Next").click();

          // check database setup card is visible
          cy.findByText("MySQL").click();
          cy.findByText("Need help connecting?").should("be.visible");
          cy.findByLabelText("Remove database").click();
          cy.findByPlaceholderText("Search for a database…").type("SQL");
          cy.findByText("SQLite").click();
          cy.findByText("Need help connecting?");

          // remove sqlite database
          cy.findByLabelText("Remove database").click();
          cy.findByText("I'll add my data later").click();

          // test database setup help card is hidden on the next step
          cy.findByText("Need help connecting?").should("not.be.visible");

          // ================
          // Data Preferences
          // ================

          // collection defaults to on and describes data collection
          cy.findByText("All collection is completely anonymous.");
          // turn collection off, which hides data collection description
          cy.findByLabelText(
            "Allow Metabase to anonymously collect usage events",
          ).click();

          cy.findByText("All collection is completely anonymous.").should(
            "not.exist",
          );

          cy.findByText("Finish").click();

          // ==================
          // Finish & Subscribe
          // ==================
          cy.findByText("You're all set up!");

          cy.findByText(
            "Get infrequent emails about new releases and feature updates.",
          );

          cy.findByText("Take me to Metabase").click();
        });

        cy.location("pathname").should("eq", "/");
      },
    );
  });

  it("should set up Metabase without first name and last name (metabase#22754)", () => {
    // This is a simplified version of the "scenarios > setup" test
    cy.visit("/");

    cy.location("pathname").should("eq", "/setup");

    skipWelcomePage();

    cy.findByTestId("setup-forms").within(() => {
      selectPreferredLanguageAndContinue();

      // User
      fillUserAndContinue({
        ...admin,
        company_name: "Epic team",
        first_name: null,
        last_name: null,
      });

      cy.findByText("Hi. Nice to meet you!");

      cy.button("Next").click();

      // Database
      cy.findByText("Add your data");
      cy.findByText("I'll add my data later").click();

      // Turns off anonymous data collection
      cy.findByLabelText(
        "Allow Metabase to anonymously collect usage events",
      ).click();

      cy.findByText("All collection is completely anonymous.").should(
        "not.exist",
      );
      cy.button("Finish").click();

      // Finish & Subscribe
      cy.findByText("Take me to Metabase").click();
    });
    cy.location("pathname").should("eq", "/");

    main()
      .findByText("Get started with Embedding Metabase in your app")
      .should("not.exist");
  });

  // Values in this test are set through MB_USER_DEFAULTS environment variable!
  // Please see https://github.com/metabase/metabase/pull/18763 for details
  it("should allow pre-filling user details", () => {
    cy.visit(`/setup#123456`);

    skipWelcomePage();

    selectPreferredLanguageAndContinue();

    cy.findByTestId("setup-forms").within(() => {
      cy.findByLabelText("First name").should("have.value", "Testy");
      cy.findByLabelText("Last name").should("have.value", "McTestface");
      cy.findByLabelText("Email").should("have.value", "testy@metabase.test");
      cy.findByLabelText("Company or team name").should(
        "have.value",
        "Epic Team",
      );
    });
  });

  it(`should allow you to connect a db during setup`, () => {
    const dbName = "SQLite db";

    cy.intercept("GET", "api/collection/root").as("getRootCollection");
    cy.intercept("GET", "api/database").as("getDatabases");

    cy.visit(`/setup#123456`);

    skipWelcomePage();

    selectPreferredLanguageAndContinue();

    cy.findByTestId("setup-forms").within(() => {
      const strongPassword = "QJbHYJN3tPW[";
      cy.findByLabelText(/^Create a password/)
        .clear()
        .type(strongPassword, { delay: 0 });
      cy.findByLabelText(/^Confirm your password/)
        .clear()
        .type(strongPassword, { delay: 0 })
        .blur();

      cy.findByText("Next").click();
    });

    cy.button("Next").click();

    cy.findByTestId("database-form").within(() => {
      cy.findByPlaceholderText("Search for a database…").type("lite").blur();
      cy.findByText("SQLite").click();
      cy.findByLabelText("Display name").type(dbName);
      cy.findByLabelText("Filename").type("./resources/sqlite-fixture.db", {
        delay: 0,
      });
      cy.button("Connect database").click();
    });

    // usage data
    cy.get("section").last().button("Finish").click();

    // done
    cy.get("section").last().findByText("Take me to Metabase").click();

    // in app
    cy.location("pathname").should("eq", "/");
    cy.wait(["@getRootCollection", "@getDatabases"]);

    cy.get("main").within(() => {
      cy.findByText("Here are some explorations of");
      cy.findAllByRole("link").should("contain", dbName);
    });

    cy.visit("/browse");
    cy.findByRole("tab", { name: "Databases" }).click();
    cy.findByTestId("database-browser").findByText(dbName);
  });

  it("embedded use-case, it should hide the db step and show the embedding homepage", () => {
    cy.visit("/setup");

    cy.location("pathname").should("eq", "/setup");

    skipWelcomePage();

    selectPreferredLanguageAndContinue();

    cy.findByTestId("setup-forms").within(() => {
      // User
      fillUserAndContinue({
        ...admin,
        company_name: "Epic team",
        first_name: null,
        last_name: null,
      });

      cy.findByText("Hi. Nice to meet you!");

      cy.findByText("Embedding analytics into my application").click();
      cy.button("Next").click();

      // Database
      cy.findByText("Add your data").should("not.exist");

      // Turns off anonymous data collection
      cy.findByLabelText(
        "Allow Metabase to anonymously collect usage events",
      ).click();

      cy.findByText("All collection is completely anonymous.").should(
        "not.exist",
      );
      cy.button("Finish").click();

      // Finish & Subscribe
      cy.findByText("Take me to Metabase").click();
    });

    cy.location("pathname").should("eq", "/");

    main()
      .findByText("Get started with Embedding Metabase in your app")
      .should("exist");

    cy.reload();

    main()
      .findByText("Get started with Embedding Metabase in your app")
      .should("exist");

    main()
      .findByRole("link", { name: "Learn more" })
      .should("have.attr", "href")
      .and(
        "match",
        /https:\/\/www.metabase.com\/docs\/[^\/]*\/embedding\/start\.html\?utm_media=embed-minimal-homepage/,
      );

    cy.icon("close").click();

    main()
      .findByText("Get started with Embedding Metabase in your app")
      .should("not.exist");

    cy.reload();

    main()
      .findByText("Get started with Embedding Metabase in your app")
      .should("not.exist");
  });
});

describeWithSnowplow("scenarios > setup", () => {
  beforeEach(() => {
    restore("blank");
    resetSnowplow();
  });

  afterEach(() => {
    expectNoBadSnowplowEvents();
  });

  it("should send snowplow events", () => {
    // 1 - new_instance_created
    // 2 - pageview
    cy.visit(`/setup`);

    // 3 - setup/step_seen "welcome"
    expectGoodSnowplowEvent({
      event: "step_seen",
      step_number: 0,
      step: "welcome",
    });
    skipWelcomePage();
    // 4 - setup/step_seen  "language"
    expectGoodSnowplowEvent({
      event: "step_seen",
      step_number: 1,
      step: "language",
    });
    selectPreferredLanguageAndContinue();

    // 5 - setup/step_seen "user_info"
    expectGoodSnowplowEvent({
      event: "step_seen",
      step_number: 2,
      step: "user_info",
    });
    cy.findByTestId("setup-forms").within(() => {
      fillUserAndContinue({
        ...admin,
        company_name: "Epic team",
      });

      cy.findByText("What will you use Metabase for?").should("exist");
      // 6 - setup/step_seen "usage_question"
      expectGoodSnowplowEvent({
        event: "step_seen",
        step_number: 3,
        step: "usage_question",
      });
      cy.button("Next").click();

      // 7 - setup/usage_reason_selected
      expectGoodSnowplowEvent({
        event: "usage_reason_selected",
        usage_reason: "self-service-analytics",
      });
      // 8 - setup/step_seen "db_connection"
      expectGoodSnowplowEvent({
        event: "step_seen",
        step_number: 4,
        step: "db_connection",
      });
      cy.findByText("I'll add my data later").click();
      // 9 - setup/add_data_later_clicked
      expectGoodSnowplowEvent({
        event: "add_data_later_clicked",
      });
      // 10 - setup/step_seen "data_usage"
      expectGoodSnowplowEvent({
        event: "step_seen",
        step_number: 5,
        step: "data_usage",
      });

      cy.findByRole("button", { name: "Finish" }).click();
      // 11 - new_user_created (from BE)

      // 12- setup/step_seen "completed"
      expectGoodSnowplowEvent({
        event: "step_seen",
        step_number: 6,
        step: "completed",
      });
    });

    expectGoodSnowplowEvents(12);
  });

  it("should ignore snowplow failures and work as normal", () => {
    blockSnowplow();
    cy.visit(`/setup`);
    skipWelcomePage();

    // 1 event is sent from the BE, which isn't blocked by blockSnoplow()
    expectGoodSnowplowEvents(1);
  });
});

const skipWelcomePage = () => {
  cy.findByTestId("welcome-page").within(() => {
    cy.findByText("Welcome to Metabase");
    cy.findByText("Let's get started").click();
  });
};

const selectPreferredLanguageAndContinue = () => {
  cy.findByText("What's your preferred language?");
  cy.findByLabelText("English");
  cy.findByText("Next").click();
};

const fillUserAndContinue = ({
  email,
  first_name,
  last_name,
  password,
  company_name,
}: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  password?: string | null;
  company_name?: string | null;
}) => {
  cy.findByText("What should we call you?");

  if (first_name) {
    cy.findByLabelText("First name").type(first_name);
  }
  if (last_name) {
    cy.findByLabelText("Last name").type(last_name);
  }
  if (email) {
    cy.findByLabelText("Email").type(email);
  }
  if (company_name) {
    cy.findByLabelText("Company or team name").type(company_name);
  }
  if (password) {
    cy.findByLabelText("Create a password").type(password);
  }
  if (password) {
    cy.findByLabelText("Confirm your password").type(password);
  }
  cy.button("Next").click();
};
