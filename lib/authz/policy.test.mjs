import test from "node:test";
import assert from "node:assert/strict";
import { authorize, ROLE_PERMISSIONS } from "./policy.mjs";

const principal = (role, propertyId = "property-a", overrides = {}) => ({
  userId: "user-1",
  active: true,
  verified: true,
  memberships: [{ propertyId, role, active: true }],
  ...overrides,
});

test("denies missing, inactive, and unverified principals", () => {
  assert.equal(authorize({ principal: null, permission: "rooms:read", propertyId: "property-a" }).allowed, false);
  assert.equal(authorize({ principal: principal("hotel_owner", "property-a", { active: false }), permission: "rooms:read", propertyId: "property-a" }).allowed, false);
  assert.equal(authorize({ principal: principal("hotel_owner", "property-a", { verified: false }), permission: "rooms:read", propertyId: "property-a" }).allowed, false);
});

test("owner access is restricted to assigned property", () => {
  assert.equal(authorize({ principal: principal("hotel_owner"), permission: "reports:business:read", propertyId: "property-a" }).allowed, true);
  assert.equal(authorize({ principal: principal("hotel_owner"), permission: "reports:business:read", propertyId: "property-b" }).allowed, false);
});

test("manager can operate but cannot access business reports or approve refunds", () => {
  const p = principal("hotel_manager");
  assert.equal(authorize({ principal: p, permission: "reservations:manage", propertyId: "property-a" }).allowed, true);
  assert.equal(authorize({ principal: p, permission: "reports:business:read", propertyId: "property-a" }).allowed, false);
  assert.equal(authorize({ principal: p, permission: "payments:refund:approve", propertyId: "property-a" }).allowed, false);
});

test("platform admin can read only explicitly named aggregate and commission reports", () => {
  const p = principal("hotel_manager", "property-a", { isPlatformAdmin: true });
  assert.equal(authorize({ principal: p, permission: "reports:business:aggregate:read" }).allowed, true);
  assert.equal(authorize({ principal: p, permission: "reports:revenue:aggregate:read" }).allowed, true);
  assert.equal(authorize({ principal: p, permission: "reports:commission:read" }).allowed, true);
  assert.equal(authorize({ principal: p, permission: "reservations:read", propertyId: "property-a" }).allowed, false);
  assert.equal(authorize({ principal: p, permission: "payments:read", propertyId: "property-a" }).allowed, false);
  assert.equal(authorize({ principal: p, permission: "reservations:manage", propertyId: "property-a" }).allowed, false);
  assert.equal(authorize({ principal: p, permission: "payments:refund:approve", propertyId: "property-a" }).allowed, false);
});

test("platform reporting permissions require a global assignment", () => {
  for (const p of [principal("hotel_owner"), principal("hotel_manager")]) {
    assert.equal(authorize({ principal: p, permission: "reports:commission:read" }).allowed, false);
    assert.equal(authorize({ principal: p, permission: "reports:revenue:aggregate:read" }).allowed, false);
  }
});

test("guest can access only owned resources in the assigned property", () => {
  const p = principal("guest");
  assert.equal(authorize({ principal: p, permission: "reservation:own:read", propertyId: "property-a", resourceOwnerUserId: "user-1" }).allowed, true);
  assert.equal(authorize({ principal: p, permission: "reservation:own:read", propertyId: "property-a", resourceOwnerUserId: "user-2" }).allowed, false);
  assert.equal(authorize({ principal: p, permission: "reservation:own:read", propertyId: "property-b", resourceOwnerUserId: "user-1" }).allowed, false);
});

test("a guest membership cannot override a separate owner membership", () => {
  const p = principal("guest", "property-a", {
    memberships: [
      { propertyId: "property-a", role: "guest", active: true },
      { propertyId: "property-a", role: "hotel_owner", active: true },
    ],
  });
  assert.equal(authorize({ principal: p, permission: "reports:business:read", propertyId: "property-a" }).allowed, true);
});

test("denies unknown permissions and inactive memberships", () => {
  assert.equal(authorize({ principal: principal("hotel_owner"), permission: "unknown:permission", propertyId: "property-a" }).allowed, false);
  const p = principal("hotel_owner", "property-a", { memberships: [{ propertyId: "property-a", role: "hotel_owner", active: false }] });
  assert.equal(authorize({ principal: p, permission: "rooms:read", propertyId: "property-a" }).allowed, false);
});

test("platform administrator does not gain hotel approval", () => {
  const globalAdmin = principal("hotel_manager", "property-a", { isPlatformAdmin: true });
  const ordinaryManager = principal("hotel_manager");
  assert.equal(authorize({ principal: globalAdmin, permission: "platform:manage" }).allowed, true);
  assert.equal(authorize({ principal: ordinaryManager, permission: "platform:manage" }).allowed, false);
  assert.equal(authorize({ principal: globalAdmin, permission: "website:approve", propertyId: "property-a" }).allowed, false);
  assert.equal(authorize({ principal: principal("hotel_owner"), permission: "website:approve", propertyId: "property-a" }).allowed, true);
});

test("permission collections are immutable at runtime", () => {
  assert.equal(Object.isFrozen(ROLE_PERMISSIONS.platform_admin), true);
  assert.throws(() => ROLE_PERMISSIONS.platform_admin.push("reservations:read"), TypeError);
});
