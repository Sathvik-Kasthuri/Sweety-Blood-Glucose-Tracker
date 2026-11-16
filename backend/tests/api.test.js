const { test, before } = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL = "http://localhost:5000/api";

let token;

before(async () => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "demo@sweety.com",
      password: "SweetyDemo@123",
    }),
  });

  assert.equal(response.status, 200);

  const data = await response.json();
  assert.ok(data.token, "Login should return a JWT token");

  token = data.token;
});

test("Protected readings route rejects missing token", async () => {
  const response = await fetch(`${BASE_URL}/readings`);

  assert.equal(response.status, 401);
});

test("Logged-in user can fetch readings", async () => {
  const response = await fetch(`${BASE_URL}/readings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.status, 200);
});

test("Glucose value below 40 is rejected", async () => {
  const today = new Date().toLocaleDateString("en-CA");

  const response = await fetch(`${BASE_URL}/readings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reading_date: today,
      time_slot: "Morning",
      glucose_value: 20,
    }),
  });

  assert.equal(response.status, 400);
});

test("Daily report is accessible to authenticated users", async () => {
  const today = new Date().toLocaleDateString("en-CA");

  const response = await fetch(
    `${BASE_URL}/reports/daily?date=${today}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  assert.equal(response.status, 200);
});