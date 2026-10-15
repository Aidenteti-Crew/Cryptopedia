import type { BuilderTypeId } from './builder-test'

/* Avalanche 생태계 홈 콘텐츠 — 문구와 이동 경로를 한 곳에서 관리한다.

   링크 원칙: 실제로 존재하는 화면·문서로만 연결한다. 해당 콘텐츠가 아직 없으면 target 을 두지 않고
   (없는 페이지로 보내지 않는다), 설명 문구도 콘텐츠가 이미 있는 것처럼 쓰지 않는다.
   현재 없는 것: 빌더 성향 테스트 페이지, Avalanche L1 구축 전용 콘텐츠, Interchain 전용 콘텐츠. */

/** 홈에서 열 수 있는 대상 — screen 은 사이드바 화면, entry 는 문서·허브 상세 */
export interface HomeTarget {
  kind: 'screen' | 'entry'
  id: string
}

export interface HomeLink {
  label: string
  target: HomeTarget
}

export interface BuildPath {
  id: string
  index: string
  title: string
  /** 핵심 설명 1~2줄 — 지금 실제로 있는 콘텐츠 기준으로만 쓴다 */
  learn: string
  links: HomeLink[]
}

export interface LearningEntry {
  id: 'fundamentals' | 'builders' | 'academy'
  number: string
  title: string
  description: string
}

/** 추천 탐색 경로의 한 단계 — 모든 단계는 실제로 존재하는 화면·문서로 이동한다. */
export interface RoadmapStep {
  title: string
  description: string
  target: HomeTarget
}

/** 키워드 한 개와 그 아래에 붙는 짧은 설명 */
export interface BuilderKeyword {
  term: string
  note: string
}

/** 결과 화면의 공통 문구. 지금은 순서대로 이수하는 커리큘럼이 아니라 관련 자료를 둘러보는 "탐색 경로"다.
   실습 콘텐츠와 완료 조건이 생겨 학습 로드맵으로 발전하면 이 객체만 바꾸면 된다. */
export const BUILDER_RESULT_COPY = {
  pathHeading: '추천 탐색 경로',
  pathCaption: '순서대로 이수하는 과정이 아니라, 관심 가는 곳부터 둘러볼 수 있는 경로입니다.',
  startCta: '나의 탐색 경로 시작하기',
  disclaimer: '선택한 답변을 바탕으로 탐색 경로를 골라 본 것이며, 성향이나 능력을 진단하는 결과가 아닙니다.',
  referenceHeading: '보조 참고 자료',
  referenceNote: '공식 문서 원문(영문)이며 새 탭에서 열립니다.',
} as const

/** 빌더 유형 테스트 결과 — "나의 빌더 프로필 + 맞춤형 탐색 경로".
   점수·퍼센트·차트는 두지 않는다(4문항으로 실제 측정한 값이 아님). 이동 가능한 모든 단계는 실제 존재하는 화면·문서여야 한다. */
export interface BuilderTypeResult {
  id: BuilderTypeId
  name: string
  /** 영문 라벨 (THE MAKER 등) */
  label: string
  /** 2~3문장 설명 — 선택한 답변을 되짚는 안내 톤이며 진단이 아니다 */
  description: string
  /** 이 유형을 설명하는 핵심 키워드 3개와 각각의 짧은 설명 */
  keywords: [BuilderKeyword, BuilderKeyword, BuilderKeyword]
  /** 이 순서로 경로를 구성한 이유 */
  rationale: string
  path: RoadmapStep[]
  /** 보조 참고 자료 — 외부 공식 문서(새 탭). 주요 경로·CTA 는 언제나 Chainery 내부 페이지다. */
  reference?: { label: string; url: string }
}

export interface BuilderTestBanner {
  label: string
  title: string
  description: string
  meta: string
  cta: string
  /** 테스트 페이지가 아직 연결되지 않아 버튼이 비활성일 때 툴팁(title)으로만 쓰는 안내 */
  disabledHint: string
}

export interface ChainHomeContent {
  hero: { subcopy: string; description: string; keywords: string[] }
  builderTest: BuilderTestBanner
  build: BuildPath[]
  learning: LearningEntry[]
  builderTypes: BuilderTypeResult[]
}

export const AVALANCHE_HOME: ChainHomeContent = {
  hero: {
    subcopy: '하나의 생태계, 다양한 블록체인의 가능성.',
    description:
      'EVM 호환 스마트 컨트랙트 개발부터 맞춤형 L1 구축, 체인 간 연결까지. Avalanche 생태계를 탐험하고 나에게 맞는 개발 경로를 찾아보세요.',
    keywords: ['EVM Compatible', 'Custom L1s', 'Interchain Messaging'],
  },

  builderTest: {
    label: 'FIND YOUR BUILDER TYPE',
    title: '나는 어떤 Avalanche 빌더일까?',
    description: '4가지 질문으로 나에게 맞는 Avalanche 탐험 경로를 찾아보세요.',
    meta: '4 QUESTIONS · ABOUT 1 MINUTE',
    cta: '나의 빌더 유형 찾기 ↗',
    disabledHint: '곧 제공될 예정입니다',
  },

  build: [
    {
      id: 'evm',
      index: '01',
      title: 'EVM 앱 개발',
      learn:
        'Solidity·Foundry·viem 같은 EVM 공통 도구의 참고 자료를 빌더 라이브러리에서 둘러볼 수 있습니다.',
      links: [{ label: '빌더 라이브러리', target: { kind: 'screen', id: 'builders' } }],
    },
    {
      id: 'l1',
      index: '02',
      title: '나만의 Avalanche L1',
      learn: '목적에 맞게 직접 구성하는 독립 블록체인입니다. 전용 학습 자료는 준비 중이며, 공식 문서에서 먼저 확인할 수 있습니다.',
      links: [{ label: '공식 문서', target: { kind: 'entry', id: 'official-docs' } }],
    },
    {
      id: 'interchain',
      index: '03',
      title: 'Interchain',
      learn: 'Avalanche L1 사이에서 메시지를 주고받는 상호운용 기능입니다. 전용 학습 자료는 준비 중이며, 공식 문서에서 먼저 확인할 수 있습니다.',
      links: [{ label: '공식 문서', target: { kind: 'entry', id: 'official-docs' } }],
    },
  ],

  learning: [
    {
      id: 'fundamentals',
      number: '01',
      title: '체인 기초',
      description: '네트워크 구조와 합의, 밸리데이터, 핵심 용어를 먼저 익힙니다.',
    },
    {
      id: 'builders',
      number: '02',
      title: '빌더 라이브러리',
      description: '공식 문서, 코드·도구 레퍼런스, MCP·에이전트 도구와 스킬을 찾아봅니다.',
    },
    {
      id: 'academy',
      number: '03',
      title: '아카데미',
      description: '입문부터 케이스별 실습까지, 순서를 따라 배웁니다.',
    },
  ],

  builderTypes: [
    {
      id: 'maker',
      name: '빠른 실행형',
      label: 'THE MAKER',
      // 상단 = 어떤 방식으로 배우고 만드는 사람인가
      description:
        '아이디어가 떠오르면 직접 실행하며 가능성을 확인하는 유형이에요. 완벽하게 이해한 뒤 시작하기보다 작은 결과를 만들고 개선하는 과정에서 배우는 걸 선호합니다.',
      keywords: [
        { term: '실행', note: '아이디어를 바로 구현' },
        { term: '실험', note: '결과를 보며 개선' },
        { term: '도구 활용', note: '기존 도구를 조합해 개발' },
      ],
      // 하단 = 왜 이 콘텐츠를 추천하며 어디부터 시작하면 좋은가
      rationale:
        '먼저 사용 가능한 개발 도구를 살펴보세요. 이후 에이전트 관련 자료와 스킬 라이브러리를 탐색하며 관심 있는 개발 방향을 구체화할 수 있습니다.',
      path: [
        {
          title: '빌더 라이브러리',
          description: '공식 문서와 코드·도구 레퍼런스에서 바로 쓸 재료를 둘러봅니다.',
          target: { kind: 'screen', id: 'builders' },
        },
        {
          title: 'MCP·에이전트 도구',
          description: '공식 조회 도구의 지원 범위를 보고, 에이전트와 체인을 연결하는 방법을 살펴봅니다.',
          target: { kind: 'entry', id: 'mcp-tools' },
        },
        {
          title: '스킬 라이브러리',
          description: '작업별 지침과 완료 조건이 담긴 스킬 중에서 반복 작업에 쓸 만한 것을 찾아봅니다.',
          target: { kind: 'entry', id: 'skill-library' },
        },
      ],
    },
    {
      id: 'analyst',
      name: '원리 탐구형',
      label: 'THE ANALYST',
      description:
        '새로운 기술을 만나면 어떤 원리로 움직이는지부터 이해하고 싶은 유형이에요. 구조를 충분히 파악한 뒤 시작할 때 확신을 갖고 나아가는 편입니다.',
      keywords: [
        { term: '원리', note: '왜 그렇게 동작하는지 파악' },
        { term: '이해', note: '개념을 서로 연결해 정리' },
        { term: '구조', note: '전체 구성을 먼저 훑어보기' },
      ],
      rationale:
        '먼저 체인 기초에서 Avalanche의 전체 구조를 살펴보세요. 이후 밸리데이터 자료로 네트워크에 참여하고 검증하는 주체를 알아보며 원리에 대한 이해를 더할 수 있습니다.',
      path: [
        {
          title: '체인 기초',
          description: '네트워크 구조와 핵심 용어로 Avalanche의 전체 그림을 살펴봅니다.',
          target: { kind: 'screen', id: 'fundamentals' },
        },
        {
          title: '합의·밸리데이터',
          description: '네트워크에 참여하고 검증하는 주체, 밸리데이터의 구조를 살펴봅니다.',
          target: { kind: 'entry', id: 'validator-structure' },
        },
      ],
    },
    {
      id: 'architect',
      name: '독립형 설계자',
      label: 'THE ARCHITECT',
      description:
        '주어진 틀을 그대로 쓰기보다 목적에 맞게 구조를 직접 설계하고 바꿔 보는 유형이에요. 규칙과 구성을 스스로 정하는 과정에서 배우는 걸 선호합니다.',
      keywords: [
        { term: '설계', note: '목적에 맞게 구조를 직접 구성' },
        { term: '구조화', note: '규칙과 요소를 체계적으로 정리' },
        { term: '커스터마이징', note: '내 방식대로 바꿔 보기' },
      ],
      rationale:
        '먼저 구조 이해 자료로 체인이 어떻게 구성되는지 살펴보세요. 이어서 공식 Docs에서 세부 내용을 확인하세요. Avalanche L1 전용 자료는 아직 없어서, L1 공식 문서(영문)를 함께 참고할 수 있습니다.',
      path: [
        {
          title: '아카데미 · 구조 이해',
          description: '각 체인이 맡은 역할로 Avalanche 네트워크의 구성을 살펴봅니다.',
          target: { kind: 'entry', id: 'structure' },
        },
        {
          title: '공식 Docs',
          description: '공식 자료 모음에서 세부 내용과 용어를 확인합니다.',
          target: { kind: 'entry', id: 'official-docs' },
        },
      ],
      // 확인한 정식 주소(HTTP 200, 리다이렉트 없음)
      reference: { label: 'Avalanche L1 공식 문서', url: 'https://build.avax.network/docs/avalanche-l1s' },
    },
    {
      id: 'connector',
      name: '연결형 탐험가',
      label: 'THE CONNECTOR',
      description:
        '하나의 기술에 머물기보다 서로 다른 시스템을 이어 보는 유형이에요. 서로 다른 요소가 어떻게 만나고 소통하는지 살펴보며 배우는 걸 선호합니다.',
      keywords: [
        { term: '연결', note: '서로 다른 요소를 이어 보기' },
        { term: '조합', note: '여러 기술을 함께 활용' },
        { term: '상호운용', note: '네트워크 사이에서 함께 동작' },
      ],
      rationale:
        '먼저 공식 Docs에서 Avalanche의 공식 자료를 살펴보세요. Interchain 전용 자료는 아직 없어서, ICM 공식 문서(영문)를 함께 참고하며 관심 있는 연결 방식을 구체화할 수 있습니다.',
      path: [
        {
          title: '공식 Docs',
          description: '공식 자료 모음에서 세부 내용과 용어를 확인합니다.',
          target: { kind: 'entry', id: 'official-docs' },
        },
      ],
      reference: {
        label: 'Interchain Messaging 공식 문서',
        url: 'https://build.avax.network/docs/cross-chain/avalanche-warp-messaging/overview',
      },
    },
  ],
}

/** 체인별 홈 콘텐츠. 등록되지 않은 체인은 null → 홈은 체인 카탈로그 데이터만으로 최소 구성된다. */
export function getChainHomeContent(chainId: string): ChainHomeContent | null {
  return chainId === 'avalanche' ? AVALANCHE_HOME : null
}
