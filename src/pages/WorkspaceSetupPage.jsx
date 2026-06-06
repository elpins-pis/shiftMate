import { useState } from "react";

import { useAuth } from "../contexts/useAuth";
import {
  createWorkspace,
  joinWorkspaceByInviteCode,
} from "../services/workspaceService";

function WorkspaceSetupPage({ onComplete }) {
  const { signOut } = useAuth();
  const [workspaceName, setWorkspaceName] = useState("내 근무표");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();

    setIsSubmitting(true);
    setMessage("");

    try {
      await createWorkspace(workspaceName);
      onComplete();
    } catch (error) {
      setMessage(error.message || "근무표를 만들지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWorkspace = async (event) => {
    event.preventDefault();

    if (!inviteCode.trim()) {
      setMessage("초대 코드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await joinWorkspaceByInviteCode(inviteCode);
      onComplete();
    } catch (error) {
      setMessage(
        error.message === "Invalid invite code"
          ? "초대 코드를 찾을 수 없습니다."
          : error.message || "근무표에 참여하지 못했습니다.",
      );
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
        padding: "24px 20px",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "26px",
        }}
      >
        <div>
          <div
            style={{
              color: "#3182f6",
              fontSize: "13px",
              fontWeight: "900",
              marginBottom: "6px",
            }}
          >
            ShiftMate
          </div>
          <h1
            style={{
              color: "#191f28",
              fontSize: "24px",
              lineHeight: "1.25",
            }}
          >
            근무표를 시작해볼까요?
          </h1>
        </div>

        <button
          type="button"
          onClick={signOut}
          style={{
            border: "none",
            background: "#f1f3f5",
            borderRadius: "999px",
            color: "#495057",
            cursor: "pointer",
            flexShrink: 0,
            fontSize: "12px",
            fontWeight: "900",
            padding: "8px 11px",
          }}
        >
          로그아웃
        </button>
      </header>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>새 근무표 만들기</h2>
        <form onSubmit={handleCreateWorkspace}>
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="근무표 이름"
            style={inputStyle}
          />
          <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
            관리자 근무표 만들기
          </button>
        </form>
      </section>

      <section style={{ ...sectionStyle, marginTop: "12px" }}>
        <h2 style={titleStyle}>초대 코드로 참여</h2>
        <form onSubmit={handleJoinWorkspace}>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="예: A1B2C3D4"
            maxLength={12}
            style={{
              ...inputStyle,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...primaryButtonStyle,
              background: "#191f28",
            }}
          >
            직원으로 참여하기
          </button>
        </form>
      </section>

      {message && (
        <div
          style={{
            background: "#fff4e6",
            border: "1px solid #ffe8cc",
            borderRadius: "12px",
            color: "#d9480f",
            fontSize: "13px",
            fontWeight: "800",
            lineHeight: "1.4",
            marginTop: "12px",
            padding: "12px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

const sectionStyle = {
  background: "#fff",
  border: "1px solid #e9ecef",
  borderRadius: "16px",
  padding: "16px",
};

const titleStyle = {
  color: "#191f28",
  fontSize: "17px",
  marginBottom: "12px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #dee2e6",
  borderRadius: "12px",
  fontSize: "15px",
  marginBottom: "10px",
  padding: "13px",
};

const primaryButtonStyle = {
  width: "100%",
  border: "none",
  background: "#3182f6",
  color: "#fff",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: "900",
  padding: "13px",
};

export default WorkspaceSetupPage;
