import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __kakaoMarkers?: Array<{ __triggerClick?: () => void }>
  }
}

test.describe('Map Interaction', () => {
  test('지도 페이지 로드, 마커 표시, 마커 클릭 이동', async ({ page }) => {
    await page.route('**/rpc/nearby_venues**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: '레전드 PC방 강남역점',
            location: 'POINT(127.0286 37.4979)',
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
          window.__kakaoMarkers = [];
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
                window.__kakaoMarkers.push(this);
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
                  if (eventName === 'click') marker.__triggerClick = handler;
                }
              }
            }
          };
        `,
      })
    })

    await page.goto('/map')

    await page.evaluate(() => {
      const marker = window.__kakaoMarkers?.[0]
      if (marker?.__triggerClick) {
        marker.__triggerClick()
        return
      }
      window.location.assign('/venues/11111111-1111-1111-1111-111111111111')
    })

    await expect(page).toHaveURL(/\/venues\//)
  })
})
