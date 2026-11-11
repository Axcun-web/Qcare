import { test } from "node:test";
import assert from "node:assert/strict";
import { feedbackSchema, FEEDBACK_MIN_LENGTH } from "./feedback.validator.js";

test("accepts text with a rating", () => {
  const r = feedbackSchema.safeParse({ isi: "Antrean jadi lebih teratur.", rating: 5 });
  assert.equal(r.success, true);
});

test("accepts text without a rating", () => {
  assert.equal(feedbackSchema.safeParse({ isi: "Antrean jadi lebih teratur." }).success, true);
});

test(`refuses text shorter than ${FEEDBACK_MIN_LENGTH} characters after trimming`, () => {
  const r = feedbackSchema.safeParse({ isi: "   bagus   ", rating: 4 });
  assert.equal(r.success, false);
  assert.ok(r.error.flatten().fieldErrors.isi);
});

test("refuses a rating outside 1-5 or not an integer", () => {
  for (const rating of [0, 6, 2.5]) {
    assert.equal(feedbackSchema.safeParse({ isi: "Antrean jadi lebih teratur.", rating }).success, false);
  }
});
