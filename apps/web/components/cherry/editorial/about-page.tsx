'use client'

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { pathForEditorialView } from '@/lib/cryptopedia-routes'
import { NAV_SECTION_LABELS, PRIMARY_NAV, type ScreenId } from '@/lib/cryptopedia-taxonomy'

import { AboutHeader } from './about-header'
import { AboutOntologyFigure } from './about-ontology-figure'
import styles from './about-page.module.css'

const BRAND_NAME = 'chainery'

/* 시안(public/cryptopedia/assets/about.jpeg)의 포도알 배치.
   x·y는 히어로 화면 안 중심 좌표(%), size는 화면 너비 대비 지름(%).
   주기·지연·진폭을 서로 다르게 줘서 각자 따로 떠다니게 하고,
   depth 가 클수록(앞에 있을수록) 마우스를 따라 더 많이 움직인다. */
const SPHERES = [
  {
    x: 64,
    y: 52,
    size: 24,
    duration: 11,
    delay: -4,
    floatX: 5,
    floatY: 14,
    depth: 0.4,
    back: true,
  },
  { x: 97, y: 8, size: 16, duration: 8, delay: -2, floatX: -4, floatY: 12, depth: 0.3, back: true },
  { x: 76, y: 12, size: 34, duration: 10, delay: 0, floatX: 8, floatY: 20, depth: 0.8 },
  { x: 95, y: 50, size: 30, duration: 9, delay: -6, floatX: -6, floatY: 16, depth: 1 },
  { x: 84, y: 92, size: 38, duration: 12, delay: -3, floatX: 7, floatY: 22, depth: 0.7 },
]

const PARALLAX_PX = 28
const TILT_DEG = 14

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    change()
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return reduced
}

/* 섹션 안 포인터 위치를 -1..1 로 정규화 */
function pointerRatio(event: ReactPointerEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
  }
}

export function AboutPage() {
  return (
    <div className={`editorial-root ${styles.landing}`}>
      <AboutHeader />
      <HeroSection />
      <SurfacesSection />
      <BrandSection />
    </div>
  )
}

/* ── ① 히어로: 포도알 + 카피 ── */
function HeroSection() {
  const reducedMotion = usePrefersReducedMotion()
  const slots = useRef<(HTMLDivElement | null)[]>([])
  const parallax = useRef({ x: 0, y: 0 })
  const drag = useRef<{
    index: number
    startX: number
    startY: number
    dx: number
    dy: number
  } | null>(null)

  // 바깥 슬롯 transform = 중심 맞춤 + 패럴랙스 + 드래그 오프셋 (스타일을 직접 써서 리렌더 없이)
  const place = (index: number) => {
    const slot = slots.current[index]
    if (!slot) return
    const { depth } = SPHERES[index]
    const px = parallax.current.x * PARALLAX_PX * depth
    const py = parallax.current.y * PARALLAX_PX * depth
    const dx = drag.current?.index === index ? drag.current.dx : 0
    const dy = drag.current?.index === index ? drag.current.dy : 0
    slot.style.transform = `translate(-50%, -50%) translate3d(${px + dx}px, ${py + dy}px, 0)`
  }
  const placeAll = () => SPHERES.forEach((_, index) => place(index))

  const onSectionMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType === 'touch') return
    parallax.current = pointerRatio(event)
    placeAll()
  }
  const onSectionLeave = () => {
    parallax.current = { x: 0, y: 0 }
    placeAll()
  }

  // 마우스·펜만 드래그 — 터치는 스크롤을 막지 않게 그대로 둔다
  const onGrab = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.dataset.dragging = 'true'
    delete event.currentTarget.dataset.released
    drag.current = { index, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 }
  }
  const onDrag = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.index !== index) return
    drag.current.dx = event.clientX - drag.current.startX
    drag.current.dy = event.clientY - drag.current.startY
    place(index)
  }
  const onRelease = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.index !== index) return
    const slot = event.currentTarget
    delete slot.dataset.dragging
    slot.dataset.released = 'true'
    drag.current = null
    place(index)
    window.setTimeout(() => delete slot.dataset.released, 1100)
  }

  return (
    <section
      className={`${styles.section} ${styles.hero}`}
      onPointerMove={onSectionMove}
      onPointerLeave={onSectionLeave}
    >
      <p className={`${styles.corner} ${styles.topLeft}`}>A place for every chain</p>
      <p className={`${styles.corner} ${styles.topRight}`}>01 / 03</p>

      <div className={styles.spheres} aria-hidden="true">
        {SPHERES.map((sphere, index) => (
          <div
            key={index}
            ref={(node) => {
              slots.current[index] = node
            }}
            className={styles.sphereSlot}
            style={{ '--x': sphere.x, '--y': sphere.y, '--size': sphere.size } as CSSProperties}
            onPointerDown={onGrab(index)}
            onPointerMove={onDrag(index)}
            onPointerUp={onRelease(index)}
            onPointerCancel={onRelease(index)}
          >
            <div
              className={`${styles.sphere} ${sphere.back ? styles.sphereBack : ''}`}
              style={
                {
                  '--float-duration': `${sphere.duration}s`,
                  '--float-delay': `${sphere.delay}s`,
                  '--float-x': `${sphere.floatX}px`,
                  '--float-y': `${sphere.floatY}px`,
                } as CSSProperties
              }
            />
          </div>
        ))}
      </div>

      <div className={styles.copy}>
        <h1 className={styles.headline}>
          Discover
          <br />
          Every Chain.
        </h1>
        <p className={styles.subcopy}>
          모든 체인의 이야기가
          <br />
          모이는 곳, 체이너리.
        </p>
        <hr className={styles.rule} />
        <p className={styles.stackedTagline}>
          A PLACE
          <br />
          FOR
          <br />
          EVERY CHAIN.
        </p>
      </div>

      <p className={`${styles.corner} ${styles.bottomLeft}`}>
        Scroll
        <span className={styles.scrollCue} aria-hidden="true">
          ↓
        </span>
      </p>
      <p
        className={`${styles.corner} ${styles.bottomRight} ${styles.pointerOnly}`}
        aria-hidden="true"
      >
        Drag the grapes
      </p>
    </section>
  )
}

/* ── ② LIVE · LEARN ──
   카드 대신 0.5px 격자선으로 나눈 한 장의 지면.
   왼쪽 LIVE 는 목차지만 줄마다 들어오는 신호(눈금)가 흘러 '지금도 수집 중'임을 보여주고,
   오른쪽 LEARN 은 핵심 개념이 모이는 구조를 고정 도판(AboutOntologyFigure)으로 보여준다. */
const screenHref = (id: ScreenId) => pathForEditorialView({ kind: 'screen', id })

/* 줄마다 신호가 흐르는 속도·간격을 달리해 기계적으로 똑같아 보이지 않게 한다 */
const LIVE_SIGNALS = [
  { speed: 7, gap: 17 },
  { speed: 11, gap: 29 },
  { speed: 9, gap: 23 },
  { speed: 5, gap: 13 },
]

function SurfacesSection() {
  return (
    <section id="live-learn" className={`${styles.section} ${styles.surfaces}`}>
      <p className={`${styles.corner} ${styles.topLeft}`}>A place for every chain</p>
      <p className={`${styles.corner} ${styles.topRight}`}>02 / 03</p>

      <div className={styles.sheet}>
        <div className={`${styles.sheetCell} ${styles.liveCell}`}>
          <p className={styles.sheetHead}>
            {NAV_SECTION_LABELS.live}
            <span className={styles.liveDot} aria-hidden="true" />
            <span className={styles.sheetHeadNote}>수집 중</span>
          </p>
          <p className={styles.sheetLead}>매일 바뀝니다.</p>
          <ol className={styles.liveIndex}>
            {PRIMARY_NAV.map((item, index) => (
              <li key={item.id}>
                <Link href={screenHref(item.id)} className={styles.liveRow}>
                  <span className={styles.liveNumber}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={styles.liveName}>{item.label}</span>
                  <span
                    className={styles.liveSignal}
                    aria-hidden="true"
                    style={
                      {
                        '--signal-speed': `${LIVE_SIGNALS[index % LIVE_SIGNALS.length].speed}s`,
                        '--signal-gap': `${LIVE_SIGNALS[index % LIVE_SIGNALS.length].gap}px`,
                      } as CSSProperties
                    }
                  />
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className={styles.sheetFoot}>체인·시장·행사·개발 소식을 자동으로 모읍니다.</p>
        </div>

        <div className={`${styles.sheetCell} ${styles.learnCell}`}>
          <p className={styles.sheetHead}>{NAV_SECTION_LABELS.learn}</p>
          <p className={styles.sheetLead}>쌓입니다.</p>
          <AboutOntologyFigure />
          <p className={styles.sheetFoot}>
            <span className={styles.figNumber}>FIG. 02</span>
            공식 문서를 문단 조각으로 나눠 핵심 개념에 모으고, 같은 개념을 아카데미와 에이전트
            스킬에 함께 씁니다.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── ③ 브랜드: 로고 오브제 + 꽉 찬 워드마크 ── */
function BrandSection() {
  const reducedMotion = usePrefersReducedMotion()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [spins, setSpins] = useState(0)

  const onMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType === 'touch') return
    const ratio = pointerRatio(event)
    setTilt({ x: -ratio.y * TILT_DEG, y: ratio.x * TILT_DEG })
  }

  return (
    <section
      className={`${styles.section} ${styles.brand}`}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <p className={`${styles.corner} ${styles.topLeft}`}>A place for every chain</p>
      <p className={`${styles.corner} ${styles.topRight}`}>03 / 03</p>

      <div className={styles.objectStage}>
        <button
          type="button"
          className={styles.logoButton}
          aria-label={`${BRAND_NAME} 로고 뒤집기`}
          onClick={() => setSpins((count) => count + 1)}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (reducedMotion ? 0 : spins * 360)}deg)`,
          }}
        >
          <span className={`${styles.logoFloat} block`}>
            <Image
              src="/cryptopedia/assets/chainery-logo.png"
              alt=""
              width={1264}
              height={1244}
              priority
              draggable={false}
              className={styles.logo}
            />
          </span>
        </button>
        <span className={styles.logoShadow} aria-hidden="true" />
      </div>

      <div className={styles.hintRow} aria-hidden="true">
        <p className={`${styles.corner} ${styles.pointerOnly}`}>Move to tilt</p>
        <p className={styles.corner}>Click to flip</p>
      </div>

      <h2 className="sr-only">{BRAND_NAME}</h2>
      <svg className={styles.giantWordmark} viewBox="0 0 1000 330" aria-hidden="true">
        {/* y 꼬리가 글자 폭 밖으로 삐져나와 textLength 를 조금 줄이고, 아래 330 까지 꼬리 공간을 둔다 */}
        <text x="0" y="240" fontSize="300" textLength="975" lengthAdjust="spacingAndGlyphs">
          {BRAND_NAME}
        </text>
      </svg>
    </section>
  )
}
