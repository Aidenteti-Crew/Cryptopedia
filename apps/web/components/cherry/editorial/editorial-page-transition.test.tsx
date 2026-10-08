import assert from "node:assert/strict"
import test from "node:test"

import { getEditorialPageMotion } from "./editorial-page-transition"

test("uses a short editorial transition without animating the first render", () => {
  const motion = getEditorialPageMotion(false)

  assert.equal(motion.initialPresence, false)
  assert.equal(motion.mode, "wait")
  assert.deepEqual(motion.initial, { opacity: 0, y: 6 })
  assert.deepEqual(motion.animate, { opacity: 1, y: 0 })
  assert.deepEqual(motion.exit, { opacity: 0, y: -4 })
  assert.equal(motion.enterTransition.duration, 0.18)
  assert.equal(motion.exitTransition.duration, 0.12)
})

test("removes movement and duration for reduced motion", () => {
  const motion = getEditorialPageMotion(true)

  assert.deepEqual(motion.initial, { opacity: 1, y: 0 })
  assert.deepEqual(motion.animate, { opacity: 1, y: 0 })
  assert.deepEqual(motion.exit, { opacity: 1, y: 0 })
  assert.equal(motion.enterTransition.duration, 0)
  assert.equal(motion.exitTransition.duration, 0)
})
