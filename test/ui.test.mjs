import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { javascript } from "../src/ui.mjs";
import { erdPage } from "../src/database.mjs";

test("navigation filter and diagram controls execute with progressively enhanced DOM", () => {
  const handlers = {};
  const filter = { addEventListener: (event, listener) => handlers[event] = listener };
  const items = [{ textContent: "Architecture" }, { textContent: "User tasks" }];
  const image = { style: {}, complete: true, addEventListener() {} };
  const port = { clientWidth: 700, addEventListener() {}, scrollLeft: 0, scrollTop: 0 };
  const clicks = {};
  const buttons = ["in", "out", "fit"].map(action => ({ dataset: { action }, addEventListener: (_, listener) => clicks[action] = listener }));
  const view = { querySelector: selector => selector === "img" ? image : port, querySelectorAll: () => buttons };
  const document = { querySelector: selector => selector === "[data-nav-filter]" ? filter : undefined, querySelectorAll: selector => selector === "[data-nav-item]" ? items : [view] };
  runInNewContext(javascript, { document });
  handlers.input({ target: { value: "user" } });
  assert.equal(items[0].hidden, true); assert.equal(items[1].hidden, false);
  assert.equal(image.style.width, "700px"); clicks.in(); assert.equal(image.style.width, "875px"); clicks.fit(); assert.equal(image.style.width, "700px");
  assert.match(erdPage({ database: "demo", schema: "public" }), /name-derived hints, not constraints/);
});
