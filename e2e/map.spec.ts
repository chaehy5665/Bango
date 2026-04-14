import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __kakaoClickableMarkers?: Array<{ __triggerClick?: () => void }>
  }
}

test.describe('Map Interaction', () => {
  test('지도 페이지 로드, 마커 클릭 시 상세 sheet 표시', async ({ page }) => {
    await page.route('**/rpc/nearby_venues**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: '레전드 PC방 강남역점',
            location: '0101000020e6100000992a1895d4c15f40d656ec2fbbbf4240',
            address_full: '서울특별시 강남구 강남대로 396',
            address_district: '강남구',
            operating_hours: { weekday: '00:00-24:00', weekend: '00:00-24:00' },
            amenities: ['24시간'],
            total_seats: 132,
            parking_available: true,
            distance_meters: 200,
          },
        ]),
      })
    })

    await page.route('**/rest/v1/venue_pricing**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/rest/v1/venue_specs**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/rest/v1/venue_peripherals**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.route('https://dapi.kakao.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.__kakaoClickableMarkers = [];
          window.kakao = {
            maps: {
              load: function (cb) { cb(); },
              LatLng: function (lat, lng) {
                this.lat = lat;
                this.lng = lng;
                this.getLat = function () { return this.lat; };
                this.getLng = function () { return this.lng; };
              },
              Map: function () {
                const center = new window.kakao.maps.LatLng(37.5665, 126.9780);
                this.panTo = function (nextCenter) {
                  center.lat = nextCenter.getLat();
                  center.lng = nextCenter.getLng();
                };
                this.getCenter = function () { return center; };
                this.setLevel = function () {};
                this.getLevel = function () { return 3; };
              },
              MarkerClusterer: function () {
                this.clear = function () {};
                this.addMarkers = function () {};
              },
              Marker: function () {
                this.setMap = function () {};
              },
              InfoWindow: function () {
                this.close = function () {};
                this.setContent = function () {};
                this.open = function () {};
              },
              MarkerImage: function () {},
              Size: function () {},
              event: {
                addListener: function (marker, eventName, handler) {
                  if (eventName === 'click') {
                    marker.__triggerClick = handler;
                    window.__kakaoClickableMarkers.push(marker);
                  }
                }
              }
            }
          };
        `,
      })
    })

    await page.goto('/map')

    await expect
      .poll(async () => page.evaluate(() => window.__kakaoClickableMarkers?.length ?? 0))
      .toBeGreaterThan(0)

    await page.evaluate(() => {
      const marker = window.__kakaoClickableMarkers?.[0]
      if (marker?.__triggerClick) {
        marker.__triggerClick()
      }
    })

    await expect(page).toHaveURL(/\/map/)
    await expect(page.getByText('레전드 PC방 강남역점')).toBeVisible()
    await expect(page.getByRole('link', { name: '상세 정보 보기' })).toBeVisible()

    await page.getByRole('link', { name: '상세 정보 보기' }).click()
    await expect(page).toHaveURL(/\/venues\/11111111-1111-1111-1111-111111111111/)
  })

  test('내 위치 버튼이 초기 위치 실패 후 다시 위치 요청을 시도함', async ({ page }) => {
    await page.addInitScript(() => {
      let geolocationRequestCount = 0

      Object.defineProperty(window.navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (
            success: (position: { coords: { latitude: number; longitude: number } }) => void,
            error?: () => void,
          ) => {
            geolocationRequestCount += 1

            if (geolocationRequestCount === 1) {
              error?.()
              return
            }

            success({
              coords: {
                latitude: 37.4979,
                longitude: 127.0286,
              },
            })
          },
        },
      })
    })

    await page.route('**/rpc/nearby_venues**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: '레전드 PC방 강남역점',
            location: '0101000020e6100000992a1895d4c15f40d656ec2fbbbf4240',
            address_full: '서울특별시 강남구 강남대로 396',
            address_district: '강남구',
            operating_hours: { weekday: '00:00-24:00', weekend: '00:00-24:00' },
            amenities: ['24시간'],
            total_seats: 132,
            parking_available: true,
            distance_meters: 200,
          },
        ]),
      })
    })

    await page.route('**/rest/v1/venue_pricing**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/rest/v1/venue_specs**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })
    await page.route('**/rest/v1/venue_peripherals**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.route('https://dapi.kakao.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.__kakaoClickableMarkers = [];
          window.kakao = {
            maps: {
              load: function (cb) { cb(); },
              LatLng: function (lat, lng) {
                this.lat = lat;
                this.lng = lng;
                this.getLat = function () { return this.lat; };
                this.getLng = function () { return this.lng; };
              },
              Map: function () {
                const center = new window.kakao.maps.LatLng(37.5665, 126.9780);
                this.panTo = function (nextCenter) {
                  center.lat = nextCenter.getLat();
                  center.lng = nextCenter.getLng();
                };
                this.getCenter = function () { return center; };
                this.setLevel = function () {};
                this.getLevel = function () { return 3; };
              },
              MarkerClusterer: function () {
                this.clear = function () {};
                this.addMarkers = function () {};
              },
              Marker: function () {
                this.setMap = function () {};
              },
              InfoWindow: function () {
                this.close = function () {};
                this.setContent = function () {};
                this.open = function () {};
              },
              MarkerImage: function () {},
              Size: function () {},
              event: {
                addListener: function (marker, eventName, handler) {
                  if (eventName === 'click') {
                    marker.__triggerClick = handler;
                    window.__kakaoClickableMarkers.push(marker);
                  }
                }
              }
            }
          };
        `,
      })
    })

    let dialogMessage: string | null = null
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message()
      await dialog.dismiss()
    })

    await page.goto('/map')

    const markerCountBefore = await page.evaluate(() => window.__kakaoClickableMarkers?.length ?? 0)

    await page.getByLabel('My Location').click()

    await expect
      .poll(async () => page.evaluate(() => window.__kakaoClickableMarkers?.length ?? 0))
      .toBeGreaterThan(markerCountBefore)

    expect(dialogMessage).toBeNull()
  })
})
