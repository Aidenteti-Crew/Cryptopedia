"use client"

import { useCallback, useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { API_URL, setAccessToken } from "@/lib/auth"
import { GoogleLoginButton } from "@/components/auth/google-login-button"
import { EmailLoginForm } from "@/components/auth/email-login-form"
import { PasswordLoginForm, type PasswordFormMode } from "@/components/auth/password-login-form"
import { SetPasswordStep } from "@/components/auth/set-password-step"
import { accountHasNoPassword } from "@/lib/password-login"
import { PlatformShell } from "@/components/cherry/editorial/platform-shell"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<"input" | "verifying" | "setPassword" | "error">("input")
  const [errorMsg, setErrorMsg] = useState("")
  const [mode, setMode] = useState<PasswordFormMode>("login")
  const [showLinkLogin, setShowLinkLogin] = useState(false)

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
  const emailFromUrl = searchParams.get("email") ?? ""
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token")
    if (!tokenFromUrl || !emailFromUrl) return
    const signupIntent = searchParams.get("intent") === "signup"

    setStep("verifying")
    fetch(`${API_URL}/api/app-user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: emailFromUrl, signInToken: tokenFromUrl }),
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.accessToken) {
          setAccessToken(data.accessToken)
          if (signupIntent && (await accountHasNoPassword(API_URL))) {
            setStep("setPassword")
            return
          }
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
  }, [searchParams, emailFromUrl, goAfterLogin])

  return (
    <PlatformShell>
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col justify-center px-4 pb-16 pt-28">
        {step === "input" && (
          <>
            <h1 className="text-[28px] font-semibold leading-tight text-[var(--editorial-strong)]">
              {mode === "login" ? "로그인" : "회원가입"}
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[var(--editorial-muted)]">
              소식과 행사는 로그인하지 않아도 볼 수 있어요.
            </p>
            <div className="mt-8">
              <PasswordLoginForm mode={mode} onModeChange={setMode} onSuccess={goAfterLogin} />
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-[var(--editorial-muted)]">
              <span className="h-px flex-1 bg-[var(--editorial-line)]" />
              또는
              <span className="h-px flex-1 bg-[var(--editorial-line)]" />
            </div>
            <div className="flex flex-col gap-2">
              <GoogleLoginButton
                fill
                onStart={() => setStep("verifying")}
                onSuccess={goAfterLogin}
                onError={(m) => { setErrorMsg(m); setStep("input") }}
              />
              {errorMsg && <p className="text-sm text-[#e58a9c]">{errorMsg}</p>}
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--editorial-muted)]">
              Google이나 이메일 링크로는 처음이어도 자동으로 가입돼요.
            </p>
            <button
              type="button"
              aria-expanded={showLinkLogin}
              onClick={() => setShowLinkLogin((open) => !open)}
              className="mt-5 self-start text-sm text-[var(--editorial-accent)]"
            >
              이메일 링크로 로그인
            </button>
            {showLinkLogin && (
              <div className="mt-3">
                <EmailLoginForm />
              </div>
            )}
          </>
        )}

        {step === "setPassword" && <SetPasswordStep email={emailFromUrl} onDone={goAfterLogin} />}

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
