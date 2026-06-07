import { useState } from "react";
import { FiCalendar, FiEye, FiEyeOff } from "react-icons/fi";

import { useAuth } from "../contexts/useAuth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 6;
const rememberedEmailKey = "shiftmate.rememberedEmail";

function AuthPage() {
  const { isSupabaseConfigured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState(getRememberedEmail);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [rememberEmail, setRememberEmail] = useState(
    Boolean(getRememberedEmail()),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const validationMessage = validateAuthForm({
      email: trimmedEmail,
      password,
      isSignUp,
    });

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      if (isSignUp) {
        await signUp({ email: trimmedEmail, password });
        window.alert(
          "회원가입이 완료되었습니다. 이메일 인증이 필요할 수 있으니 메일함을 확인해주세요.",
        );
        setMode("signin");
        setEmail("");
        setPassword("");
        setShowPassword(false);
        setMessage("이메일 인증을 완료한 뒤 로그인해주세요.");
      } else {
        await signIn({ email: trimmedEmail, password });
        saveRememberedEmail(rememberEmail ? trimmedEmail : "");
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "430px",
        minHeight: "100vh",
        margin: "0 auto",
        background: "#fff",
        padding: "28px 20px",
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "#3182f6",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FiCalendar size={18} />
          </div>
          <div
            style={{
              color: "#3182f6",
              fontSize: "15px",
              fontWeight: "900",
            }}
          >
            ShiftMate
          </div>
        </div>
        <h1
          style={{
            color: "#191f28",
            fontSize: "26px",
            lineHeight: "1.25",
            marginBottom: "8px",
          }}
        >
          근무표 관리의 시작
        </h1>
        <p
          style={{
            color: "#868e96",
            fontSize: "14px",
            fontWeight: "700",
            lineHeight: "1.45",
          }}
        >
          근무 일정, 더 간편하게.
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <div
          style={{
            background: "#fff4e6",
            border: "1px solid #ffe8cc",
            borderRadius: "14px",
            color: "#d9480f",
            fontSize: "14px",
            fontWeight: "800",
            lineHeight: "1.5",
            padding: "16px",
          }}
        >
          `.env`에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를
          설정한 뒤 개발 서버를 다시 시작해주세요.
        </div>
      ) : (
        <>
          <div
            style={{
              background: "#f8f9fb",
              border: "1px solid #e9ecef",
              borderRadius: "14px",
              marginBottom: "14px",
              padding: "14px",
            }}
          >
            <div
              style={{
                color: "#191f28",
                fontSize: "14px",
                fontWeight: "900",
                marginBottom: "5px",
              }}
            >
              초대코드가 있나요?
            </div>
            <div
              style={{
                color: "#868e96",
                fontSize: "13px",
                fontWeight: "700",
                lineHeight: "1.45",
              }}
            >
              직원은 회원가입 또는 로그인 후 초대코드를 입력하면 등록된
              이메일로 자동 연결됩니다.
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setEmail(rememberEmail ? getRememberedEmail() : "");
                  setPassword("");
                  setShowPassword(false);
                  setMessage("");
                }}
                style={getModeButtonStyle(!isSignUp)}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setEmail("");
                  setPassword("");
                  setShowPassword(false);
                  setMessage("");
                }}
                style={getModeButtonStyle(isSignUp)}
              >
                회원가입
              </button>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                placeholder="이메일"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="비밀번호"
                  style={{
                    ...inputStyle,
                    paddingRight: "46px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    color: "#868e96",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px",
                  }}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {isSignUp && (
                <div
                  style={{
                    color: "#868e96",
                    fontSize: "12px",
                    fontWeight: "700",
                    marginTop: "6px",
                  }}
                >
                  비밀번호는 6자 이상 입력해주세요.
                </div>
              )}
            </div>

            {!isSignUp && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#495057",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "800",
                  marginBottom: "16px",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(event) => {
                    const isChecked = event.target.checked;

                    setRememberEmail(isChecked);

                    if (!isChecked) {
                      saveRememberedEmail("");
                    }
                  }}
                />
                이메일 기억하기
              </label>
            )}

            {message && (
              <div
                style={{
                  background: "#f8f9fb",
                  borderRadius: "10px",
                  color: "#495057",
                  fontSize: "13px",
                  fontWeight: "700",
                  lineHeight: "1.4",
                  marginBottom: "12px",
                  padding: "12px",
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                border: "none",
                background: isSubmitting ? "#adb5bd" : "#3182f6",
                color: "#fff",
                borderRadius: "12px",
                padding: "14px",
                fontSize: "16px",
                fontWeight: "900",
                cursor: isSubmitting ? "default" : "pointer",
              }}
            >
              {isSubmitting ? "처리 중" : isSignUp ? "회원가입" : "로그인"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function getRememberedEmail() {
  try {
    return localStorage.getItem(rememberedEmailKey) || "";
  } catch {
    return "";
  }
}

function saveRememberedEmail(email) {
  try {
    if (email) {
      localStorage.setItem(rememberedEmailKey, email);
    } else {
      localStorage.removeItem(rememberedEmailKey);
    }
  } catch {
    // localStorage may be unavailable in private browsing modes.
  }
}

function validateAuthForm({ email, password, isSignUp }) {
  if (!email) {
    return "이메일을 입력해주세요.";
  }

  if (/\s/.test(email)) {
    return "이메일에는 공백을 넣을 수 없습니다.";
  }

  if (!emailPattern.test(email)) {
    return "이메일 형식이 올바르지 않습니다. 예: name@example.com";
  }

  if (!password) {
    return "비밀번호를 입력해주세요.";
  }

  if (isSignUp && password.length < minimumPasswordLength) {
    return `비밀번호는 ${minimumPasswordLength}자 이상 입력해주세요.`;
  }

  return "";
}

function getAuthErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }

  if (message.includes("User already registered")) {
    return "이미 가입된 이메일입니다. 로그인으로 진행해주세요.";
  }

  if (message.includes("Email not confirmed")) {
    return "이메일 인증을 완료한 뒤 로그인해주세요.";
  }

  if (message.toLowerCase().includes("password")) {
    return "비밀번호 조건을 확인해주세요.";
  }

  if (message.toLowerCase().includes("email")) {
    return "이메일 주소를 확인해주세요.";
  }

  return message || "처리 중 오류가 발생했습니다.";
}

function getModeButtonStyle(isActive) {
  return {
    border: "none",
    background: isActive ? "#3182f6" : "#f1f3f5",
    color: isActive ? "#fff" : "#495057",
    borderRadius: "10px",
    padding: "11px",
    fontWeight: "900",
    cursor: "pointer",
  };
}

const inputStyle = {
  width: "100%",
  border: "1px solid #dee2e6",
  borderRadius: "12px",
  fontSize: "15px",
  padding: "14px",
};

export default AuthPage;
