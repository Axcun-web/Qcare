import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTempPassword, TEMP_PASSWORD_LENGTH } from "./tempPassword.js";

test("has the default length and meets the 8-72 rule", () => {
  const pw = generateTempPassword();
  assert.equal(pw.length, TEMP_PASSWORD_LENGTH);
  assert.ok(pw.length >= 8 && pw.length <= 72);
});

test("always contains a digit and no ambiguous characters", () => {
  for (let i = 0; i < 200; i += 1) {
    const pw = generateTempPassword();
    assert.match(pw, /[2-9]/);
    assert.doesNotMatch(pw, /[01OIl]/);
  }
});

test("is not repeated across calls", () => {
  const seen = new Set(
    Array.from({ length: 200 }, () => generateTempPassword()),
  );
  assert.equal(seen.size, 200);
});
