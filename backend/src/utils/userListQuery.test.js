import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseUserListQuery,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./userListQuery.js";

test("no parameters: everyone, first page", () => {
  const r = parseUserListQuery({});
  assert.deepEqual(r.where, {});
  assert.equal(r.page, 1);
  assert.equal(r.skip, 0);
  assert.equal(r.take, DEFAULT_PAGE_SIZE);
});

test("search matches name or email, case-insensitive, trimmed", () => {
  const r = parseUserListQuery({ q: "  budi " });
  assert.deepEqual(r.where.OR, [
    { nama: { contains: "budi", mode: "insensitive" } },
    { email: { contains: "budi", mode: "insensitive" } },
  ]);
});

test("role and status filters combine", () => {
  const r = parseUserListQuery({ role: "PETUGAS", status: "inactive" });
  assert.deepEqual(r.where, { role: "PETUGAS", isActive: false });
});

test("unknown role and status are ignored", () => {
  const r = parseUserListQuery({ role: "HACKER", status: "maybe" });
  assert.deepEqual(r.where, {});
});

test("page 3 of 20 skips 40", () => {
  const r = parseUserListQuery({ page: "3" });
  assert.equal(r.skip, 40);
});

test("invalid page falls back to 1, page size is capped", () => {
  const r = parseUserListQuery({ page: "-2", pageSize: "1000" });
  assert.equal(r.page, 1);
  assert.equal(r.pageSize, MAX_PAGE_SIZE);
});
