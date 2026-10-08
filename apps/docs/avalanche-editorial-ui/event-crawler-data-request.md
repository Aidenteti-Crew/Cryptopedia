# Avalanche 행사·이벤트 크롤링 데이터 요청서

## 요청 목적

Cryptopedia의 `행사·이벤트` 화면에 실제 Avalanche 생태계 일정을 연결하려고 합니다. 현재 수집 구조의 `published_at`은 행사 안내 글의 게시일이므로 행사 개최일로 사용할 수 없습니다. 프론트가 목 데이터에서 실데이터로 교체될 수 있도록 아래 이벤트 전용 출력 계약을 요청드립니다.

## 현재 확인된 한계

현재 크롤링 결과는 대체로 다음 값을 제공합니다.

```text
title
body 또는 content_raw
published_at
author
url
canonical_url
fetched_at
```

이 구조에는 행사 시작일·종료일·시간대·장소·신청 링크가 없습니다. `published_at`을 행사 시작일로 재사용하지 말아 주세요.

## 요청 산출물

1. 행사 원문에서 이벤트 전용 필드를 추출한 결과
2. 프론트가 호출할 이벤트 목록 API
3. 누락값·취소·연기·온라인 행사를 포함한 검증 결과
4. 최소 5개의 Avalanche 행사 실데이터 예시

DB 내부 테이블 설계는 크롤링 담당 영역에서 정해도 됩니다. 프론트에는 아래 응답 계약만 보장해 주세요.

## 필수 응답 타입

```ts
export type EventStatus =
  | "UPCOMING"
  | "ONGOING"
  | "PAST"
  | "CANCELLED"
  | "POSTPONED"

export interface EventEntry {
  id: string
  title: string
  summary: string
  startsAt: string
  endsAt: string | null
  timezone: string
  allDay: boolean
  status: EventStatus
  organizer: string | null
  venueName: string | null
  venueAddress: string | null
  city: string | null
  country: string | null
  isOnline: boolean
  sourceUrl: string | null
  registrationUrl: string | null
  imageUrl: string | null
  category: string | null
  tags: string[]
  chain: string | null
  project: string | null
  publishedAt: string | null
  fetchedAt: string
  confidence: number | null
}

export interface EventFeedResponse {
  items: EventEntry[]
  nextCursor: string | null
  generatedAt: string
}
```

## 필드 규칙

### 날짜와 시간

- 모든 날짜·시간은 ISO 8601 문자열로 주세요.
- 시간이 확인되면 UTC offset을 포함해 주세요. 예: `2026-11-12T10:00:00+09:00`.
- 행사 현지 시간대는 IANA timezone으로 주세요. 예: `Asia/Seoul`.
- 날짜만 있고 시간이 없으면 현지 자정으로 저장하고 `allDay: true`로 주세요.
- 종료일을 확인할 수 없으면 `endsAt: null`로 주세요.
- `publishedAt`은 안내 글 게시일이고 `startsAt`은 행사 개최일입니다. 두 필드를 합치지 말아 주세요.

### 상태

- 원문에 취소가 명시되면 `CANCELLED`가 시간 계산보다 우선합니다.
- 원문에 연기가 명시되면 `POSTPONED`가 시간 계산보다 우선합니다.
- 시작 전은 `UPCOMING`, 시작 후 종료 전은 `ONGOING`, 종료 후는 `PAST`입니다.
- `endsAt`이 없는 행사는 해당 timezone의 행사 날짜가 끝난 뒤 `PAST`로 처리해 주세요.
- API 응답 시 상태를 계산하고 오래된 저장 상태만 그대로 반환하지 말아 주세요.

### 장소

- 온라인 전용 행사는 `isOnline: true`로 주세요.
- 확인할 수 없는 장소 필드는 `null`로 주세요.
- 온라인 URL은 `registrationUrl` 또는 `sourceUrl`로 제공해 주세요.
- 비공개 회의 URL이나 토큰은 저장하거나 반환하지 말아 주세요.

### 출처와 중복 제거

- 실데이터 API의 `sourceUrl`은 행사 정보를 확인할 수 있는 원문이어야 합니다. 프론트 목 데이터만 `null`을 허용합니다.
- 신청 URL이 원문과 다르면 `registrationUrl`에 넣어 주세요.
- `id`는 재수집해도 변하지 않는 안정적인 값이어야 합니다.
- 동일 행사의 여러 안내 글은 가능한 한 하나의 이벤트로 합쳐 주세요.
- 공식 행사 페이지를 우선하고 더 구체적인 날짜·장소 정보를 선택해 주세요.

### 신뢰도

- `confidence`는 `0`에서 `1` 사이 값 또는 `null`입니다.
- 날짜가 자연어에서 추론됐거나 연도가 생략된 경우 낮은 신뢰도를 사용해 주세요.
- 날짜를 확정할 수 없으면 임의 추론하지 말고 API에서 제외하거나 별도 검토 대상으로 분리해 주세요.

## 목록 API 요청

```http
GET /api/events?chain=avalanche&status=upcoming&from=2026-10-01&to=2026-12-31&limit=20&cursor=<cursor>
```

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `chain` | 아니오 | 기본값 `avalanche` |
| `status` | 아니오 | upcoming, ongoing, past, cancelled, postponed |
| `from` | 아니오 | 행사 시작일 하한, `YYYY-MM-DD` |
| `to` | 아니오 | 행사 시작일 상한, `YYYY-MM-DD` |
| `limit` | 아니오 | 기본 20, 최대 100 |
| `cursor` | 아니오 | 다음 페이지 커서 |

정렬은 upcoming·ongoing은 `startsAt` 오름차순, past는 내림차순으로 요청합니다. 취소·연기는 원래 시작일을 기준으로 정렬해 주세요.

## 응답 예시

```json
{
  "items": [
    {
      "id": "crypto-house-seoul-2026",
      "title": "Crypto House Seoul '26",
      "summary": "Avalanche 생태계 커뮤니티 행사",
      "startsAt": "2026-11-28T14:00:00+09:00",
      "endsAt": null,
      "timezone": "Asia/Seoul",
      "allDay": false,
      "status": "UPCOMING",
      "organizer": "Team1 Korea",
      "venueName": "위워크 선릉 2호점",
      "venueAddress": null,
      "city": "Seoul",
      "country": "KR",
      "isOnline": false,
      "sourceUrl": "https://example.com/event",
      "registrationUrl": null,
      "imageUrl": null,
      "category": "COMMUNITY",
      "tags": ["Avalanche", "Community"],
      "chain": "Avalanche",
      "project": null,
      "publishedAt": "2026-10-20T09:00:00+09:00",
      "fetchedAt": "2026-10-21T03:00:00+09:00",
      "confidence": 0.95
    }
  ],
  "nextCursor": null,
  "generatedAt": "2026-10-21T03:00:00+09:00"
}
```

위 URL과 내용은 응답 모양을 설명하기 위한 예시입니다. 실제 테스트에서는 확인 가능한 공식 행사 URL을 사용해 주세요.

## 오류 응답

```json
{
  "code": "INVALID_EVENT_QUERY",
  "message": "from must be earlier than to"
}
```

- 잘못된 query는 HTTP 400
- 서버 오류는 HTTP 500
- 빈 결과는 HTTP 200과 `items: []`
- 오류 응답에 원문 HTML, 토큰, 내부 DB 접속정보를 포함하지 말아 주세요.

## 완료 기준

- [ ] `publishedAt`과 `startsAt`이 분리되어 있다.
- [ ] 모든 `startsAt`이 ISO 8601이며 timezone 해석이 가능하다.
- [ ] 온라인·오프라인·장소 미정 행사가 모두 계약에 맞는다.
- [ ] 종료일이 없는 행사도 상태 판정 규칙이 정해져 있다.
- [ ] 취소·연기 행사를 구분한다.
- [ ] 최소 5개 Avalanche 실데이터가 스키마 검증을 통과한다.
- [ ] 같은 행사 중복 입력이 제거된다.
- [ ] upcoming과 past 정렬이 요구사항과 일치한다.
- [ ] 빈 결과가 오류가 아닌 빈 배열로 반환된다.
- [ ] 프론트 목 JSON과 동일한 `EventFeedResponse` 구조로 응답한다.

## 전달 요청

1. API base URL과 인증 필요 여부
2. 개발·스테이징 환경 호출 예시
3. 실제 응답 샘플 JSON
4. 행사 데이터의 원본 출처 목록
5. 날짜·시간대 추출 실패 처리 방식
6. 중복 제거 기준
7. 갱신 주기와 마지막 성공 수집 시각 확인 방법
