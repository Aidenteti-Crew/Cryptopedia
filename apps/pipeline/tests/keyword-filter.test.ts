import { describe, expect, it } from 'vitest'

import { applyKeywordFilter } from '../src/ingestion/keyword-filter.js'

const filter = { include: ['블록체인', 'Web3', 'NFT'], exclude: ['입찰', '채용'] }

describe('applyKeywordFilter', () => {
  it('keeps a post whose title or body names a keyword', () => {
    expect(applyKeywordFilter(filter, '「2026 블록체인 진흥주간」 사전등록', '')).toEqual({ keep: true })
    expect(applyKeywordFilter(filter, '해커톤 참가자 모집', '주제: NFT 활용')).toEqual({ keep: true })
  })

  it('ignores case, full-width forms and spacing', () => {
    expect(applyKeywordFilter(filter, 'WEB 3 컨퍼런스', '')).toEqual({ keep: true })
    expect(applyKeywordFilter(filter, 'ＮＦＴ 전시', '')).toEqual({ keep: true })
    expect(applyKeywordFilter(filter, '블록 체인 세미나', '')).toEqual({ keep: true })
  })

  it('drops a post with no keyword', () => {
    expect(applyKeywordFilter(filter, '개인정보 세미나', '가명정보 활용')).toEqual({
      keep: false,
      reason: 'NO_KEYWORD',
    })
  })

  it('drops a title with an exclude keyword, but not for one only in the body', () => {
    expect(applyKeywordFilter(filter, '블록체인팀 채용 공고', '')).toEqual({
      keep: false,
      reason: 'EXCLUDED',
    })
    expect(applyKeywordFilter(filter, '블록체인 진흥주간', '부대행사: 채용 상담')).toEqual({
      keep: true,
    })
  })
})
