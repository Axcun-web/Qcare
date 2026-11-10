import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldTouchLastSeen, isRecentlyActive } from "./presence.js";

const now = new Date("2026-11-10T13:00:00.000Z");
const ago = (ms) => new Date(now.getTime() - ms);

test("touch when never seen or a minute has passed", () => {
  assert.equal(shouldTouchLastSeen(null, now), true);
  assert.equal(shouldTouchLastSeen(ago(60_000), now), true);
});

test("do not touch again within a minute", () => {
  assert.equal(shouldTouchLastSeen(ago(30_000), now), false);
});

test("recently active within 5 minutes only", () => {
  assert.equal(isRecentlyActive(ago(4 * 60_000), now), true);
  assert.equal(isRecentlyActive(ago(5 * 60_000), now), false);
  assert.equal(isRecentlyActive(null, now), false);
});
