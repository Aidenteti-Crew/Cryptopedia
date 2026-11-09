"use client"

import { useCallback, useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { API_URL, setAccessToken } from "@/lib/auth"
import { GoogleLoginButton } from "@/components/auth/google-login-button"
import { EmailLoginForm } from "@/components/auth/email-login-form"
import { PlatformShell } from "@/components/cherry/editorial/platform-shell"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<"input" | "verifying" | "error">("input")
  const [errorMsg, setErrorMsg] = useState("")

  // 로그인 성공 후 돌아갈 경로 — /login?next=/start 저장
  useEffect(() => {
    const nextFromUrl = searchParams.get("next")
    if (nextFromUrl && nextFromUrl.startsWith("/")) {
      try { localStorage.setItem("cherry_login_next", nextFromUrl) } catch { /* noop */ }
    }
  }, [searchParams])

  const goAfterLogin = useCallback(() => {
    let dest = "/"
    try {
      const saved = localStorage.getItem("cherry_login_next")
      if (saved && saved.startsWith("/")) {
        dest = saved
        localStorage.removeItem("cherry_login_next")
      }
    } catch { /* noop */ }
    router.push(dest)
  }, [router])

  // 매직링크(?token=&email=) 자동 로그인 — 백엔드 매직링크는 유지되므로 그대로 처리
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token")
    const emailFromUrl = searchParams.get("email")
    if (!tokenFromUrl || !emailFromUrl) return

    setStep("verifying")
    fetch(`${API_URL}/api/app-user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: emailFromUrl, signInToken: tokenFromUrl }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.accessToken) {
          setAccessToken(data.accessToken)
          goAfterLogin()
        } else {
          setErrorMsg(data.message ?? "로그인 링크가 만료됐거나 이미 사용됐어요.")
          setStep("error")
        }
      })
      .catch(() => {
        setErrorMsg("서버에 연결하지 못했어요.")
        setStep("error")
      })
  }, [searchParams, goAfterLogin])

  return (
    <PlatformShell>
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col justify-center px-4 pb-16 pt-28">
        {step === "input" && (
          <>
            <h1 className="text-[28px] font-semibold leading-tight text-[var(--editorial-strong)]">
              로그인
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[var(--editorial-muted)]">
              처음이면 자동으로 가입돼요. 소식과 행사는 로그인하지 않아도 볼 수 있어요.
            </p>
            <div className="mt-8 flex flex-col gap-2">
              <GoogleLoginButton
                fill
                onStart={() => setStep("verifying")}
                onSuccess={goAfterLogin}
                onError={(m) => { setErrorMsg(m); setStep("input") }}
              />
              {errorMsg && <p className="text-sm text-[#e58a9c]">{errorMsg}</p>}
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-[var(--editorial-muted)]">
              <span className="h-px flex-1 bg-[var(--editorial-line)]" />
              또는
              <span className="h-px flex-1 bg-[var(--editorial-line)]" />
            </div>
            <EmailLoginForm />
          </>
        )}

        {step === "verifying" && (
          <p role="status" className="text-[15px] text-[var(--editorial-strong)]">
            로그인하는 중…
          </p>
        )}

        {step === "error" && (
          <div>
            <h1 className="text-[22px] font-semibold text-[var(--editorial-strong)]">로그인하지 못했어요</h1>
            <p className="mt-3 text-[15px] leading-7 text-[var(--editorial-muted)]">{errorMsg}</p>
            <button
              onClick={() => { setErrorMsg(""); setStep("input") }}
              className="mt-6 text-sm text-[var(--editorial-accent)]"
            >
              다시 시도하기
            </button>
          </div>
        )}
      </main>
    </PlatformShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
