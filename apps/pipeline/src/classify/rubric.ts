// The one importance scale used everywhere (article classification, project and event scoring).
// Taken from the original Cherry scorer (python_services/packages/agent/news_agent: breadth,
// urgency, actionability, durability), with only the audience changed from ML engineers to
// people following the chain's ecosystem. Change it here and every scorer follows.
export const IMPORTANCE_RUBRIC = `importance (integer 1-5) for someone following the Avalanche ecosystem:
5점: 모두가 알아야 함. 영향이 넓고, 급하고, 바로 실행 가능하고, 오래 감.
4점: 의미 있지만 확실성·긴급성·범위 중 하나가 부족함.
3점: 알아두면 좋은 배경 지식.
2점: 실무 영향이 작음. 틈새 도구나 추측성 내용.
1점: 가치 없음. 낡은 정보, 과장, 근거 부족.
importance_reason: 1-2 Korean sentences explaining the score against this scale.`
