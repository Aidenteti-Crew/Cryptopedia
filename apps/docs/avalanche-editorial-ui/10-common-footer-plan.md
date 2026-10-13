# 전체 페이지 공통 footer

사용자 요청: footer를 별도 컴포넌트로 만들고 모든 에디토리얼 페이지에 적용한다.

## 구성과 적용

- `editorial-footer.tsx`: 기존 브랜드 상수를 사용해 Proof of Cherry, Aidenteti Crew, 블록체인 지식 라이브러리 설명과 연도 표시.
- 바로가기: 생태계 홈, 케이스별 실습, 스킬 라이브러리. 기존 상태 기반 화면 이동을 사용한다.
- `editorial-shell.tsx`의 main 다음에 한 번만 렌더링한다. 상세·목록·로딩·오류 화면에 공통 적용하며 모바일은 세로, 데스크탑은 가로 배치.
- 홈·컬렉션·이벤트·피드의 개별 사이트 footer 제거. 문서 상세의 공식 문서·다음 문서 링크는 footer 태그를 일반 컨테이너로 바꿔 유지한다.
- 기존 `/start/*` 독립 앱과 API·DB는 변경하지 않는다.

## 검수

| 항목 | 상태 | 기준 |
|---|---|---|
| 공통 컴포넌트 | ✅ | 셸에 footer 한 개, main 밖에 렌더링 |
| 전체 메뉴 적용 | ✅ | 주요 화면 9종에서 footer 개수·공통 링크 렌더링 검사 |
| 중복 제거·문서 동작 보존 | ✅ | 사이트 footer 제거, 공식 Docs와 다음 문서 링크 테스트 유지 |
| 관련 테스트 | ✅ | 70개 통과, `git diff --check` 통과 |
| 브라우저 | ✅ | Chrome 1440/834/390에서 홈·목록·상세 footer 한 개와 바로가기 이동 확인, pageerror 0 |

증빙: `/private/tmp/cryptopedia-footer-browser-result.json`, `/private/tmp/cryptopedia-footer-1440.png`, `/private/tmp/cryptopedia-footer-390.png`.
