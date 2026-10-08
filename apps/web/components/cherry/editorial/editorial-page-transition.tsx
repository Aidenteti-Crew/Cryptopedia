"use client"

import type { ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

const EDITORIAL_EASE = [0.2, 0, 0, 1] as const

export function getEditorialPageMotion(reduceMotion: boolean) {
  return {
    initialPresence: false as const,
    mode: "wait" as const,
    initial: reduceMotion
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: -4 },
    enterTransition: {
      duration: reduceMotion ? 0 : 0.18,
      ease: EDITORIAL_EASE,
    },
    exitTransition: {
      duration: reduceMotion ? 0 : 0.12,
      ease: EDITORIAL_EASE,
    },
  }
}

export function EditorialPageTransition({
  transitionKey,
  children,
}: {
  transitionKey: string
  children: ReactNode
}) {
  const reduceMotion = Boolean(useReducedMotion())
  const pageMotion = getEditorialPageMotion(reduceMotion)

  return (
    <AnimatePresence
      initial={pageMotion.initialPresence}
      mode={pageMotion.mode}
    >
      <motion.div
        key={transitionKey}
        initial={pageMotion.initial}
        animate={pageMotion.animate}
        exit={{
          ...pageMotion.exit,
          transition: pageMotion.exitTransition,
        }}
        transition={pageMotion.enterTransition}
        className="min-w-0"
        data-editorial-transition={transitionKey}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
