import { test } from "node:test";
import assert from "node:assert/strict";
import { updateNameSchema, changePasswordSchema } from "./auth.validator.js";

const fieldErrors = (result) => result.error.flatten().fieldErrors;

test("updateNameSchema accepts a matching name and trims it", () => {
  const result = updateNameSchema.safeParse({
    nama: "  Budi Hartono ",
    konfirmasiNama: "Budi Hartono",
  });
  assert.equal(result.success, true);
  assert.equal(result.data.nama, "Budi Hartono");
});

test("updateNameSchema rejects a name shorter than 3 characters", () => {
  const result = updateNameSchema.safeParse({
    nama: "Bu",
    konfirmasiNama: "Bu",
  });
  assert.equal(result.success, false);
  assert.ok(fieldErrors(result).nama);
});

test("updateNameSchema rejects a confirmation that does not match", () => {
  const result = updateNameSchema.safeParse({
    nama: "Budi Hartono",
    konfirmasiNama: "Budi",
  });
  assert.equal(result.success, false);
  assert.ok(fieldErrors(result).konfirmasiNama);
});

test("changePasswordSchema accepts a valid change", () => {
  const result = changePasswordSchema.safeParse({
    passwordLama: "lama12345",
    passwordBaru: "baru12345",
    konfirmasiPassword: "baru12345",
  });
  assert.equal(result.success, true);
});

test("changePasswordSchema rejects a new password shorter than 8", () => {
  const result = changePasswordSchema.safeParse({
    passwordLama: "lama12345",
    passwordBaru: "baru123",
    konfirmasiPassword: "baru123",
  });
  assert.equal(result.success, false);
  assert.ok(fieldErrors(result).passwordBaru);
});

test("changePasswordSchema rejects a confirmation that does not match", () => {
  const result = changePasswordSchema.safeParse({
    passwordLama: "lama12345",
    passwordBaru: "baru12345",
    konfirmasiPassword: "baru54321",
  });
  assert.equal(result.success, false);
  assert.ok(fieldErrors(result).konfirmasiPassword);
});

test("changePasswordSchema rejects a new password equal to the old one", () => {
  const result = changePasswordSchema.safeParse({
    passwordLama: "sama12345",
    passwordBaru: "sama12345",
    konfirmasiPassword: "sama12345",
  });
  assert.equal(result.success, false);
  assert.ok(fieldErrors(result).passwordBaru);
});

test("changePasswordSchema requires the old password", () => {
  const result = changePasswordSchema.safeParse({
    passwordLama: "",
    passwordBaru: "baru12345",
    konfirmasiPassword: "baru12345",
  });
  assert.equal(result.success, false);
  assert.ok(fieldErrors(result).passwordLama);
});
