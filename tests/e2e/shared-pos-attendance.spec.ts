import { expect, test } from "@playwright/test";
import { mockTenantContext } from "./tenantContextFixture";

const employeeId = "11111111-1111-1111-1111-111111111111";

async function pressPin(page: import("@playwright/test").Page, pin: string) {
  for (const digit of pin) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

test("shared POS keeps invalid PIN on lock screen and auto-locks after punch", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nf_shared_device_token", "device-test-token");
    localStorage.setItem("nf_shared_mode", "1");
  });

  let unlockAttempt = 0;
  await page.route("**/api/shared-pos/unlock", async (route) => {
    expect(route.request().headers()["x-nf-device-token"]).toBe("device-test-token");
    unlockAttempt += 1;

    if (unlockAttempt === 1) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "SHARED_POS_AUTH_FAILED",
          message: "Perangkat atau PIN tidak valid.",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionToken: "session-test-token",
        expiresAtUtc: "2026-09-02T09:00:00Z",
        employee: {
          id: employeeId,
          nama: "Dewi Safitri",
          jabatan: "Kasir",
          role: null,
          canAccessPos: false,
        },
        attendance: {
          date: "2026-09-02",
          status: "scheduled",
          checkIn: null,
          checkOut: null,
          scheduleStart: "09:00",
          scheduleEnd: "17:00",
          exceptionType: null,
          outsideSchedule: false,
          nextAction: "checkin",
        },
        posToken: null,
        posExpiresAtUtc: null,
      }),
    });
  });

  await page.route("**/api/shared-pos/attendance/checkin", async (route) => {
    expect(route.request().headers()["x-nf-session-token"]).toBe("session-test-token");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        recordedAt: "09:03",
        attendance: {
          date: "2026-09-02",
          status: "working",
          checkIn: "09:03",
          checkOut: null,
          scheduleStart: "09:00",
          scheduleEnd: "17:00",
          exceptionType: null,
          outsideSchedule: false,
          nextAction: "checkout",
        },
      }),
    });
  });

  await page.goto("/shared-pos");
  await pressPin(page, "9999");

  await expect(page).toHaveURL(/\/shared-pos/);
  await expect(page.getByRole("alert")).toContainText("Perangkat atau PIN tidak valid");

  await pressPin(page, "4321");
  await expect(page.getByRole("heading", { name: "Halo, Dewi Safitri" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check In" })).toBeVisible();

  await page.getByRole("button", { name: "Check In" }).click();
  await expect(page.getByRole("status")).toContainText("Check in tercatat 09:03");
  await expect(page.getByRole("heading", { name: "Masukkan PIN karyawan" })).toBeVisible();

  const sharedSession = await page.evaluate(() =>
    sessionStorage.getItem("nf_shared_session_token")
  );
  expect(sharedSession).toBeNull();
});

test("owner can activate current browser as shared POS without retaining owner token", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nfpos_token", "owner-test-token");
  });

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        nama: "Owner Test",
        username: "owner",
        role: "owner",
      }),
    });
  });
  await mockTenantContext(page);

  await page.route("**/api/attendance/dashboard*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        date: "2026-09-02",
        summary: {
          scheduled: 1,
          present: 0,
          late: 0,
          absent: 0,
          working: 0,
          missingCheckout: 0,
        },
        employees: [
          {
            karyawanId: employeeId,
            karyawanNama: "Dewi Safitri",
            jabatan: "Kasir",
            status: "scheduled",
            scheduleStart: "09:00",
            scheduleEnd: "17:00",
            checkIn: null,
            checkOut: null,
            outsideSchedule: false,
            exceptionType: null,
            exceptionNote: null,
          },
        ],
      }),
    });
  });

  await page.route("**/api/karyawan", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: employeeId,
          nama: "Dewi Safitri",
          jabatan: "Kasir",
          status: "aktif",
        },
      ]),
    });
  });
  await page.route(`**/api/karyawan/${employeeId}/shared-access`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        karyawanId: employeeId,
        userId: null,
        linkedUsername: null,
        hasPin: false,
        pinUpdatedAt: null,
      }),
    });
  });
  await page.route(`**/api/attendance/employees/${employeeId}/schedule`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
          startTime: "09:00:00",
          endTime: "17:00:00",
        }))
      ),
    });
  });
  await page.route("**/api/attendance/exceptions*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/api/users", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/api/shared-pos/devices", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          device: {
            id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
            name: "Kasir Utama",
            active: true,
            lastUsedAt: null,
            createdAt: "2026-09-02T07:00:00Z",
          },
          deviceToken: "registered-device-token",
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/api/attendance/policy", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ graceMinutes: 10, absenceThresholdMinutes: 120 }),
    });
  });

  await page.goto("/absensi/kelola");
  await expect(page.getByRole("heading", { name: "Kelola Absensi" })).toBeVisible();
  await expect(page.getByText("Dewi Safitri", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Aktifkan Shared POS di Perangkat Ini" }).click();
  await expect(page).toHaveURL(/\/shared-pos/);

  const state = await page.evaluate(() => ({
    deviceToken: localStorage.getItem("nf_shared_device_token"),
    ownerToken: localStorage.getItem("nfpos_token"),
    sharedMode: localStorage.getItem("nf_shared_mode"),
  }));
  expect(state.deviceToken).toBe("registered-device-token");
  expect(state.ownerToken).toBeNull();
  expect(state.sharedMode).toBe("1");
});
