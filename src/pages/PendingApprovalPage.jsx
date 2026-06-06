import { useAuth } from "../contexts/useAuth";

function PendingApprovalPage({ workspace }) {
  const { signOut } = useAuth();

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
      <div style={{ marginBottom: "26px" }}>
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
            fontSize: "25px",
            lineHeight: "1.28",
            marginBottom: "8px",
          }}
        >
          관리자 승인을 기다리고 있어요
        </h1>
        <p
          style={{
            color: "#868e96",
            fontSize: "14px",
            fontWeight: "700",
            lineHeight: "1.45",
          }}
        >
          {workspace?.name || "근무표"} 참여 요청이 접수되었습니다.
          승인되면 스케줄을 확인할 수 있습니다.
        </p>
      </div>

      <div
        style={{
          background: "#f8f9fb",
          border: "1px solid #e9ecef",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            color: "#191f28",
            fontSize: "15px",
            fontWeight: "900",
            marginBottom: "6px",
          }}
        >
          승인 전에는 이렇게 제한됩니다
        </div>
        <div
          style={{
            color: "#5c677d",
            fontSize: "13px",
            fontWeight: "700",
            lineHeight: "1.55",
          }}
        >
          직원, 근무유형, 스케줄, 통계 데이터는 관리자 승인 후에만 볼 수
          있습니다.
        </div>
      </div>

      <button
        type="button"
        onClick={signOut}
        style={{
          width: "100%",
          border: "none",
          background: "#f1f3f5",
          color: "#495057",
          borderRadius: "12px",
          cursor: "pointer",
          fontSize: "15px",
          fontWeight: "900",
          padding: "13px",
        }}
      >
        로그아웃
      </button>
    </div>
  );
}

export default PendingApprovalPage;
