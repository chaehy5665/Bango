BEGIN;

WITH seed_venues AS (
  SELECT *
  FROM (
    VALUES
      ('레전드 PC방 강남역점', 127.0286, 37.4979, '서울특별시 강남구 강남대로 396', '강남구', '02-561-1720', '{"weekday":"00:00-24:00","weekend":"00:00-24:00"}'::jsonb, ARRAY['24시간', '무료 음료', '흡연실', '프린터', '고속 충전']::text[], 132, true),
      ('홍대 게이밍존 PC방', 126.9237, 37.5563, '서울특별시 마포구 와우산로 94', '마포구', '02-332-5589', '{"weekday":"10:00-03:00","weekend":"09:00-04:00"}'::jsonb, ARRAY['무료 음료', '흡연실', '스캐너', 'VR존']::text[], 98, false),
      ('종로 스타 PC라운지', 126.9910, 37.5702, '서울특별시 종로구 종로 119', '종로구', '02-734-7012', '{"weekday":"09:00-02:00","weekend":"08:00-03:00"}'::jsonb, ARRAY['무료 음료', '프린터', '스캐너', '단체석']::text[], 76, false),
      ('잠실 오버워치 아레나 PC방', 127.1001, 37.5133, '서울특별시 송파구 올림픽로 269', '송파구', '02-425-2090', '{"weekday":"00:00-24:00","weekend":"00:00-24:00"}'::jsonb, ARRAY['24시간', '샤워실', '무료 음료', '흡연실', '주차 지원']::text[], 148, true),
      ('영등포 프로게이머 PC클럽', 126.9035, 37.5186, '서울특별시 영등포구 영중로 12', '영등포구', '02-2678-4411', '{"weekday":"10:00-02:00","weekend":"10:00-04:00"}'::jsonb, ARRAY['무료 음료', '흡연실', '프린터', '배달 가능']::text[], 112, true),
      ('신림 e스포츠 스테이션', 126.9292, 37.4841, '서울특별시 관악구 남부순환로 1614', '관악구', '02-872-6673', '{"weekday":"00:00-24:00","weekend":"00:00-24:00"}'::jsonb, ARRAY['24시간', '무료 음료', '샤워실', '흡연실', '휴게실']::text[], 124, false),
      ('건대 디지털 게임월드 PC방', 127.0686, 37.5400, '서울특별시 광진구 아차산로 240', '광진구', '02-462-7810', '{"weekday":"09:00-03:00","weekend":"09:00-04:00"}'::jsonb, ARRAY['무료 음료', 'VR존', '흡연실', '프린터']::text[], 103, false),
      ('노원 넥스트레벨 PC방', 127.0610, 37.6542, '서울특별시 노원구 동일로 1414', '노원구', '02-952-3044', '{"weekday":"10:00-02:00","weekend":"09:00-03:00"}'::jsonb, ARRAY['무료 음료', '흡연실', '스캐너', '주차 지원']::text[], 88, true),
      ('신촌 플래티넘 PC카페', 126.9368, 37.5568, '서울특별시 서대문구 연세로 27', '서대문구', '02-324-9011', '{"weekday":"10:00-03:00","weekend":"09:00-04:00"}'::jsonb, ARRAY['무료 음료', '흡연실', '프린터', '단체석']::text[], 94, false),
      ('구로 메가비트 PC방', 126.8874, 37.4954, '서울특별시 구로구 디지털로32길 79', '구로구', '02-859-5570', '{"weekday":"00:00-24:00","weekend":"00:00-24:00"}'::jsonb, ARRAY['24시간', '무료 음료', '샤워실', '흡연실', '프린터']::text[], 136, true)
  ) AS v(name, lng, lat, address_full, address_district, phone, operating_hours, amenities, total_seats, parking_available)
),
inserted_venues AS (
  INSERT INTO venues (
    name,
    location,
    address_full,
    address_district,
    phone,
    operating_hours,
    amenities,
    total_seats,
    parking_available
  )
  SELECT
    name,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    address_full,
    address_district,
    phone,
    operating_hours,
    amenities,
    total_seats,
    parking_available
  FROM seed_venues
  RETURNING id, name
)
SELECT COUNT(*) FROM inserted_venues;

INSERT INTO venue_pricing (venue_id, tier_name, pricing_structure, description)
SELECT
  v.id,
  p.tier_name,
  p.pricing_structure,
  p.description
FROM (
  VALUES
    ('레전드 PC방 강남역점', '일반석', '{"hourly":1400,"3hours":3900,"6hours":7300,"overnight":11000}'::jsonb, '강남역 표준 게이밍 좌석'),
    ('레전드 PC방 강남역점', '프리미엄석', '{"hourly":1800,"3hours":5000,"6hours":9200,"overnight":13800,"package":{"30hours":45000}}'::jsonb, 'RTX 4070 탑재 프리미엄 좌석'),
    ('레전드 PC방 강남역점', '커플석', '{"hourly":3200,"3hours":9000,"6hours":17000}'::jsonb, '2인 전용 나란히 좌석'),
    ('홍대 게이밍존 PC방', '일반석', '{"hourly":1300,"3hours":3600,"6hours":6800,"overnight":9800}'::jsonb, '학생 선호 일반석'),
    ('홍대 게이밍존 PC방', '프리미엄석', '{"hourly":1700,"3hours":4700,"6hours":8700,"overnight":12900}'::jsonb, '고주사율 모니터 구역'),
    ('종로 스타 PC라운지', '일반석', '{"hourly":1200,"3hours":3400,"6hours":6400,"overnight":9200}'::jsonb, '비즈니스 접근성 좋은 일반석'),
    ('종로 스타 PC라운지', 'VIP석', '{"hourly":1900,"3hours":5400,"6hours":9800,"overnight":14500}'::jsonb, '프라이빗 칸막이 VIP석'),
    ('잠실 오버워치 아레나 PC방', '일반석', '{"hourly":1400,"3hours":3900,"6hours":7300,"overnight":10800}'::jsonb, '경기장형 배치 일반석'),
    ('잠실 오버워치 아레나 PC방', '프리미엄석', '{"hourly":1900,"3hours":5500,"6hours":10100,"overnight":14900,"package":{"50hours":76000}}'::jsonb, '방음 헤드셋 포함 프리미엄석'),
    ('잠실 오버워치 아레나 PC방', '커플석', '{"hourly":3400,"3hours":9600,"6hours":18200}'::jsonb, '듀오 플레이 전용 커플석'),
    ('영등포 프로게이머 PC클럽', '일반석', '{"hourly":1300,"3hours":3600,"6hours":6800,"overnight":9900}'::jsonb, '역세권 실속형 좌석'),
    ('영등포 프로게이머 PC클럽', '프리미엄석', '{"hourly":1700,"3hours":4700,"6hours":8700,"overnight":12800}'::jsonb, 'e스포츠 세팅 프리미엄석'),
    ('신림 e스포츠 스테이션', '일반석', '{"hourly":1200,"3hours":3400,"6hours":6400,"overnight":9300}'::jsonb, '24시간 운영 일반석'),
    ('신림 e스포츠 스테이션', '프리미엄석', '{"hourly":1600,"3hours":4500,"6hours":8300,"overnight":12200}'::jsonb, '대학가 인기 프리미엄석'),
    ('건대 디지털 게임월드 PC방', '일반석', '{"hourly":1300,"3hours":3600,"6hours":6800,"overnight":9800}'::jsonb, '건대 상권 기본 좌석'),
    ('건대 디지털 게임월드 PC방', '프리미엄석', '{"hourly":1700,"3hours":4700,"6hours":8600,"overnight":12600}'::jsonb, '스트리밍용 프리미엄 좌석'),
    ('노원 넥스트레벨 PC방', '일반석', '{"hourly":1200,"3hours":3400,"6hours":6300,"overnight":9100}'::jsonb, '합리적 가격 일반석'),
    ('노원 넥스트레벨 PC방', '커플석', '{"hourly":3000,"3hours":8400,"6hours":15800}'::jsonb, '영화형 듀얼 모니터 커플석'),
    ('신촌 플래티넘 PC카페', '일반석', '{"hourly":1300,"3hours":3600,"6hours":6800,"overnight":10000}'::jsonb, '신촌 학원가 중심 일반석'),
    ('신촌 플래티넘 PC카페', '프리미엄석', '{"hourly":1800,"3hours":5000,"6hours":9200,"overnight":13600}'::jsonb, '27인치 240Hz 프리미엄석'),
    ('구로 메가비트 PC방', '일반석', '{"hourly":1200,"3hours":3400,"6hours":6400,"overnight":9300}'::jsonb, '디지털단지 직장인 선호 좌석'),
    ('구로 메가비트 PC방', 'VIP석', '{"hourly":1900,"3hours":5400,"6hours":9800,"overnight":14500}'::jsonb, '넓은 책상형 VIP석')
) AS p(venue_name, tier_name, pricing_structure, description)
JOIN venues AS v ON v.name = p.venue_name;

INSERT INTO venue_specs (venue_id, cpu, gpu, ram_gb, storage, monitor, internet_speed_mbps)
SELECT
  v.id,
  s.cpu,
  s.gpu,
  s.ram_gb,
  s.storage,
  s.monitor,
  s.internet_speed_mbps
FROM (
  VALUES
    ('레전드 PC방 강남역점', 'Intel i7-13700K', 'NVIDIA RTX 4070', 32, 'NVMe SSD 1TB', '27인치 IPS 240Hz', 1000),
    ('홍대 게이밍존 PC방', 'Intel i5-13400', 'NVIDIA RTX 4060', 16, 'NVMe SSD 500GB', '24인치 IPS 165Hz', 500),
    ('종로 스타 PC라운지', 'AMD Ryzen 5 7600', 'NVIDIA RTX 4060', 16, 'NVMe SSD 500GB', '24인치 IPS 144Hz', 500),
    ('잠실 오버워치 아레나 PC방', 'Intel i7-14700K', 'NVIDIA RTX 4080', 32, 'NVMe SSD 1TB', '27인치 IPS 240Hz', 1000),
    ('영등포 프로게이머 PC클럽', 'AMD Ryzen 7 7800X3D', 'NVIDIA RTX 4070', 32, 'NVMe SSD 1TB', '27인치 IPS 240Hz', 1000),
    ('신림 e스포츠 스테이션', 'Intel i5-14600K', 'AMD Radeon RX 7800 XT', 32, 'NVMe SSD 1TB', '27인치 IPS 165Hz', 1000),
    ('건대 디지털 게임월드 PC방', 'Intel i5-13400', 'NVIDIA RTX 4060', 16, 'NVMe SSD 500GB', '24인치 IPS 144Hz', 500),
    ('노원 넥스트레벨 PC방', 'AMD Ryzen 5 7500F', 'AMD Radeon RX 7600', 16, 'NVMe SSD 500GB', '24인치 IPS 165Hz', 500),
    ('신촌 플래티넘 PC카페', 'Intel i7-13700K', 'NVIDIA RTX 4070', 32, 'NVMe SSD 1TB', '27인치 IPS 240Hz', 1000),
    ('구로 메가비트 PC방', 'Intel i9-14900K', 'NVIDIA RTX 4080', 64, 'NVMe SSD 1TB', '27인치 IPS 240Hz', 1000)
) AS s(venue_name, cpu, gpu, ram_gb, storage, monitor, internet_speed_mbps)
JOIN venues AS v ON v.name = s.venue_name;

INSERT INTO venue_peripherals (venue_id, peripheral_type, brand, model)
SELECT
  v.id,
  p.peripheral_type::peripheral_type,
  p.brand,
  p.model
FROM (
  VALUES
    ('레전드 PC방 강남역점', 'keyboard', 'Logitech', 'G Pro X TKL'),
    ('레전드 PC방 강남역점', 'mouse', 'Logitech', 'G Pro X Superlight 2'),
    ('레전드 PC방 강남역점', 'headset', 'SteelSeries', 'Arctis Nova 7'),
    ('레전드 PC방 강남역점', 'chair', 'Herman Miller', 'Aeron Gaming Edition'),
    ('홍대 게이밍존 PC방', 'keyboard', 'Razer', 'BlackWidow V4'),
    ('홍대 게이밍존 PC방', 'mouse', 'Razer', 'DeathAdder V3'),
    ('홍대 게이밍존 PC방', 'headset', 'HyperX', 'Cloud III'),
    ('홍대 게이밍존 PC방', 'chair', 'DXRacer', 'Formula Series'),
    ('종로 스타 PC라운지', 'keyboard', 'Corsair', 'K70 RGB PRO'),
    ('종로 스타 PC라운지', 'mouse', 'Logitech', 'G502 X'),
    ('종로 스타 PC라운지', 'headset', 'HyperX', 'Cloud Alpha'),
    ('종로 스타 PC라운지', 'chair', 'Secretlab', 'TITAN Evo'),
    ('잠실 오버워치 아레나 PC방', 'keyboard', 'Razer', 'Huntsman V3 Pro'),
    ('잠실 오버워치 아레나 PC방', 'mouse', 'Logitech', 'G Pro Wireless'),
    ('잠실 오버워치 아레나 PC방', 'headset', 'SteelSeries', 'Arctis Pro'),
    ('잠실 오버워치 아레나 PC방', 'chair', 'Herman Miller', 'Vantum'),
    ('영등포 프로게이머 PC클럽', 'keyboard', 'Logitech', 'G913 TKL'),
    ('영등포 프로게이머 PC클럽', 'mouse', 'Razer', 'Viper V3 Pro'),
    ('영등포 프로게이머 PC클럽', 'headset', 'HyperX', 'Cloud II'),
    ('영등포 프로게이머 PC클럽', 'chair', 'Secretlab', 'OMEGA 2024'),
    ('신림 e스포츠 스테이션', 'keyboard', 'Corsair', 'K65 Plus Wireless'),
    ('신림 e스포츠 스테이션', 'mouse', 'Logitech', 'G304'),
    ('신림 e스포츠 스테이션', 'headset', 'SteelSeries', 'Arctis 7+'),
    ('신림 e스포츠 스테이션', 'chair', 'DXRacer', 'Air Mesh'),
    ('건대 디지털 게임월드 PC방', 'keyboard', 'Razer', 'BlackWidow V3'),
    ('건대 디지털 게임월드 PC방', 'mouse', 'Logitech', 'G403 HERO'),
    ('건대 디지털 게임월드 PC방', 'headset', 'HyperX', 'Cloud Stinger 2'),
    ('건대 디지털 게임월드 PC방', 'chair', 'Secretlab', 'TITAN Evo Lite'),
    ('노원 넥스트레벨 PC방', 'keyboard', 'Logitech', 'G512 Carbon'),
    ('노원 넥스트레벨 PC방', 'mouse', 'Razer', 'Basilisk V3'),
    ('노원 넥스트레벨 PC방', 'headset', 'SteelSeries', 'Arctis 1'),
    ('노원 넥스트레벨 PC방', 'chair', 'DXRacer', 'Drifting Series'),
    ('신촌 플래티넘 PC카페', 'keyboard', 'Corsair', 'K70 MAX'),
    ('신촌 플래티넘 PC카페', 'mouse', 'Logitech', 'G Pro X Superlight'),
    ('신촌 플래티넘 PC카페', 'headset', 'HyperX', 'Cloud Orbit S'),
    ('신촌 플래티넘 PC카페', 'chair', 'Herman Miller', 'Embody Gaming'),
    ('구로 메가비트 PC방', 'keyboard', 'Razer', 'DeathStalker V2'),
    ('구로 메가비트 PC방', 'mouse', 'Logitech', 'MX518 Legendary'),
    ('구로 메가비트 PC방', 'headset', 'SteelSeries', 'Arctis Nova Pro'),
    ('구로 메가비트 PC방', 'chair', 'Secretlab', 'TITAN Evo XL')
) AS p(venue_name, peripheral_type, brand, model)
JOIN venues AS v ON v.name = p.venue_name;

INSERT INTO venue_menu_items (venue_id, category, item_name, price_krw, is_available)
SELECT
  v.id,
  m.category,
  m.item_name,
  m.price_krw,
  m.is_available
FROM (
  VALUES
    ('레전드 PC방 강남역점', '라면', '신라면', 3800, true),
    ('레전드 PC방 강남역점', '라면', '짜파게티', 4200, true),
    ('레전드 PC방 강남역점', '음료', '콜라', 1800, true),
    ('레전드 PC방 강남역점', '음료', '아이스 아메리카노', 2500, true),
    ('레전드 PC방 강남역점', '스낵', '새우깡', 1500, true),
    ('레전드 PC방 강남역점', '주류', '참이슬', 4500, true),
    ('홍대 게이밍존 PC방', '라면', '너구리', 3600, true),
    ('홍대 게이밍존 PC방', '라면', '육개장 사발면', 2500, true),
    ('홍대 게이밍존 PC방', '음료', '사이다', 1700, true),
    ('홍대 게이밍존 PC방', '음료', '포카리스웨트', 2200, true),
    ('홍대 게이밍존 PC방', '스낵', '프링글스 오리지널', 2500, true),
    ('홍대 게이밍존 PC방', '스낵', '초코파이', 1800, true),
    ('종로 스타 PC라운지', '라면', '진라면 매운맛', 3500, true),
    ('종로 스타 PC라운지', '라면', '불닭볶음면', 4200, true),
    ('종로 스타 PC라운지', '음료', '콜라 제로', 1800, true),
    ('종로 스타 PC라운지', '음료', '바나나우유', 2000, true),
    ('종로 스타 PC라운지', '스낵', '포카칩', 1600, true),
    ('종로 스타 PC라운지', '식사', '참치김밥', 4500, true),
    ('잠실 오버워치 아레나 PC방', '라면', '신라면 블랙', 4500, true),
    ('잠실 오버워치 아레나 PC방', '라면', '안성탕면', 3600, true),
    ('잠실 오버워치 아레나 PC방', '음료', '레몬에이드', 2800, true),
    ('잠실 오버워치 아레나 PC방', '음료', '에너지드링크', 3000, true),
    ('잠실 오버워치 아레나 PC방', '스낵', '치토스', 1700, true),
    ('잠실 오버워치 아레나 PC방', '식사', '치즈돈까스', 8500, true),
    ('영등포 프로게이머 PC클럽', '라면', '열라면', 3500, true),
    ('영등포 프로게이머 PC클럽', '라면', '김치사발면', 2400, true),
    ('영등포 프로게이머 PC클럽', '음료', '사이다', 1600, true),
    ('영등포 프로게이머 PC클럽', '음료', '핫식스', 2800, true),
    ('영등포 프로게이머 PC클럽', '스낵', '오징어땅콩', 1800, true),
    ('영등포 프로게이머 PC클럽', '주류', '카스 캔맥주', 4500, true),
    ('신림 e스포츠 스테이션', '라면', '불닭볶음면', 4300, true),
    ('신림 e스포츠 스테이션', '라면', '왕뚜껑', 2600, true),
    ('신림 e스포츠 스테이션', '음료', '콜라', 1700, true),
    ('신림 e스포츠 스테이션', '음료', '아이스티 복숭아', 2000, true),
    ('신림 e스포츠 스테이션', '스낵', '홈런볼', 1800, true),
    ('신림 e스포츠 스테이션', '식사', '치즈김밥', 4800, true),
    ('건대 디지털 게임월드 PC방', '라면', '진라면 순한맛', 3400, true),
    ('건대 디지털 게임월드 PC방', '라면', '짜왕', 4300, true),
    ('건대 디지털 게임월드 PC방', '음료', '환타 오렌지', 1700, true),
    ('건대 디지털 게임월드 PC방', '음료', '캔커피', 2000, true),
    ('건대 디지털 게임월드 PC방', '스낵', '새우깡', 1500, true),
    ('건대 디지털 게임월드 PC방', '식사', '참치마요 삼각김밥', 2200, true),
    ('노원 넥스트레벨 PC방', '라면', '너구리', 3500, true),
    ('노원 넥스트레벨 PC방', '라면', '김치라면', 3400, true),
    ('노원 넥스트레벨 PC방', '음료', '사이다', 1600, true),
    ('노원 넥스트레벨 PC방', '음료', '게토레이', 2200, true),
    ('노원 넥스트레벨 PC방', '스낵', '포카칩', 1500, true),
    ('노원 넥스트레벨 PC방', '식사', '햄치즈 토스트', 4000, true),
    ('신촌 플래티넘 PC카페', '라면', '신라면', 3700, true),
    ('신촌 플래티넘 PC카페', '라면', '까르보불닭볶음면', 4600, true),
    ('신촌 플래티넘 PC카페', '음료', '콜드브루', 3200, true),
    ('신촌 플래티넘 PC카페', '음료', '제로사이다', 1900, true),
    ('신촌 플래티넘 PC카페', '스낵', '허니버터칩', 2200, true),
    ('신촌 플래티넘 PC카페', '주류', '참이슬', 4500, true),
    ('구로 메가비트 PC방', '라면', '신라면', 3500, true),
    ('구로 메가비트 PC방', '라면', '육개장 사발면', 2500, true),
    ('구로 메가비트 PC방', '음료', '콜라', 1600, true),
    ('구로 메가비트 PC방', '음료', '파워에이드', 2200, true),
    ('구로 메가비트 PC방', '스낵', '콘칩', 1700, true),
    ('구로 메가비트 PC방', '식사', '불고기 덮밥', 7900, true)
) AS m(venue_name, category, item_name, price_krw, is_available)
JOIN venues AS v ON v.name = m.venue_name;

INSERT INTO venue_images (venue_id, image_url, image_category, display_order, alt_text)
SELECT
  v.id,
  i.image_url,
  i.image_category::image_category,
  i.display_order,
  i.alt_text
FROM (
  VALUES
    ('레전드 PC방 강남역점', 'https://picsum.photos/800/600?random=6101', 'exterior', 1, '레전드 PC방 강남역점 외관 전경'),
    ('레전드 PC방 강남역점', 'https://picsum.photos/800/600?random=6102', 'interior', 2, '강남역점 실내 좌석 배치'),
    ('레전드 PC방 강남역점', 'https://picsum.photos/800/600?random=6103', 'setup', 3, '프리미엄 좌석 장비 클로즈업'),
    ('홍대 게이밍존 PC방', 'https://picsum.photos/800/600?random=6201', 'exterior', 1, '홍대 게이밍존 입구'),
    ('홍대 게이밍존 PC방', 'https://picsum.photos/800/600?random=6202', 'interior', 2, '홍대점 실내 전경'),
    ('홍대 게이밍존 PC방', 'https://picsum.photos/800/600?random=6203', 'menu', 3, '홍대점 스낵 메뉴 안내판'),
    ('종로 스타 PC라운지', 'https://picsum.photos/800/600?random=6301', 'exterior', 1, '종로 스타 PC라운지 외부'),
    ('종로 스타 PC라운지', 'https://picsum.photos/800/600?random=6302', 'interior', 2, '종로점 라운지형 좌석'),
    ('종로 스타 PC라운지', 'https://picsum.photos/800/600?random=6303', 'setup', 3, '종로점 게이밍 데스크 셋업'),
    ('잠실 오버워치 아레나 PC방', 'https://picsum.photos/800/600?random=6401', 'exterior', 1, '잠실 오버워치 아레나 건물 전면'),
    ('잠실 오버워치 아레나 PC방', 'https://picsum.photos/800/600?random=6402', 'interior', 2, '잠실점 경기장형 내부'),
    ('잠실 오버워치 아레나 PC방', 'https://picsum.photos/800/600?random=6403', 'setup', 3, '잠실점 고사양 좌석 장비'),
    ('영등포 프로게이머 PC클럽', 'https://picsum.photos/800/600?random=6501', 'exterior', 1, '영등포 프로게이머 PC클럽 외관'),
    ('영등포 프로게이머 PC클럽', 'https://picsum.photos/800/600?random=6502', 'interior', 2, '영등포점 내부 통로와 좌석'),
    ('영등포 프로게이머 PC클럽', 'https://picsum.photos/800/600?random=6503', 'menu', 3, '영등포점 푸드 코너 사진'),
    ('신림 e스포츠 스테이션', 'https://picsum.photos/800/600?random=6601', 'exterior', 1, '신림 e스포츠 스테이션 외부 간판'),
    ('신림 e스포츠 스테이션', 'https://picsum.photos/800/600?random=6602', 'interior', 2, '신림점 실내 조명 분위기'),
    ('신림 e스포츠 스테이션', 'https://picsum.photos/800/600?random=6603', 'setup', 3, '신림점 표준 좌석 셋업'),
    ('건대 디지털 게임월드 PC방', 'https://picsum.photos/800/600?random=6701', 'exterior', 1, '건대 디지털 게임월드 외부'),
    ('건대 디지털 게임월드 PC방', 'https://picsum.photos/800/600?random=6702', 'interior', 2, '건대점 내부 전경'),
    ('건대 디지털 게임월드 PC방', 'https://picsum.photos/800/600?random=6703', 'menu', 3, '건대점 메뉴 보드'),
    ('노원 넥스트레벨 PC방', 'https://picsum.photos/800/600?random=6801', 'exterior', 1, '노원 넥스트레벨 PC방 외관'),
    ('노원 넥스트레벨 PC방', 'https://picsum.photos/800/600?random=6802', 'interior', 2, '노원점 내부 좌석 배치'),
    ('노원 넥스트레벨 PC방', 'https://picsum.photos/800/600?random=6803', 'setup', 3, '노원점 게이밍 장비 모습'),
    ('신촌 플래티넘 PC카페', 'https://picsum.photos/800/600?random=6901', 'exterior', 1, '신촌 플래티넘 PC카페 입구'),
    ('신촌 플래티넘 PC카페', 'https://picsum.photos/800/600?random=6902', 'interior', 2, '신촌점 프리미엄석 구역'),
    ('신촌 플래티넘 PC카페', 'https://picsum.photos/800/600?random=6903', 'menu', 3, '신촌점 음료 냉장고와 메뉴'),
    ('구로 메가비트 PC방', 'https://picsum.photos/800/600?random=7001', 'exterior', 1, '구로 메가비트 PC방 외관 사진'),
    ('구로 메가비트 PC방', 'https://picsum.photos/800/600?random=7002', 'interior', 2, '구로점 실내 좌석 전경'),
    ('구로 메가비트 PC방', 'https://picsum.photos/800/600?random=7003', 'setup', 3, '구로점 VIP석 셋업')
) AS i(venue_name, image_url, image_category, display_order, alt_text)
JOIN venues AS v ON v.name = i.venue_name;

COMMIT;
