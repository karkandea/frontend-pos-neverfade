import { expect, test } from "@playwright/test";

const employeeId = "11111111-1111-1111-1111-111111111111";

test("absensi uses the real backend request and response shape", async ({ page }) => {
  const postedBodies: Array<{ url: string; body: unknown }> = [];

  await page.addInitScript(() => {
    localStorage.setItem("nfpos_token", "phase3-test-token");
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

  await page.route("**/api/karyawan*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: employeeId,
          nama: "Dewi Safitri",
          jabatan: "Kasir",
          telepon: "",
          email: "",
          gaji: 0,
          tanggalMasuk: "2026-01-01",
          status: "Aktif",
          catatan: "",
        },
      ]),
    });
  });

  let attendance = [
    {
      id: "22222222-2222-2222-2222-222222222222",
      karyawanId: employeeId,
      karyawanNama: "Dewi Safitri",
      jabatan: "Kasir",
      tanggal: "2026-09-02",
      checkIn: null,
      checkOut: null,
    },
  ];

  await page.route("**/api/absensi", async (route) => {
    const request = route.request();
    expect(new URL(request.url()).searchParams.has("search")).toBe(false);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(attendance),
    });
  });

  await page.route("**/api/absensi/checkin", async (route) => {
    const body = route.request().postDataJSON();
    postedBodies.push({ url: route.request().url(), body });

    attendance = [
      {
        ...attendance[0],
        checkIn: "09:10",
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, checkIn: "09:10", fotoUrl: null }),
    });
  });

  await page.route("**/api/absensi/checkout", async (route) => {
    const body = route.request().postDataJSON();
    postedBodies.push({ url: route.request().url(), body });

    attendance = [
      {
        ...attendance[0],
        checkOut: "17:15",
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, checkOut: "17:15", fotoUrl: null }),
    });
  });

  await page.goto("/absensi");

  await expect(page.getByText("Dewi Safitri", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Kasir", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Check In" }).click();
  await expect(page.getByText("09:10", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Check Out" }).click();
  await expect(page.getByText("17:15", { exact: true })).toBeVisible();

  expect(postedBodies).toHaveLength(2);
  expect(postedBodies[0].body).toEqual({ karyawanId: employeeId });
  expect(postedBodies[1].body).toEqual({ karyawanId: employeeId });
});
