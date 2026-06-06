import { Link } from "react-router-dom";

const guideSections = [
  {
    title: "시작하기",
    items: [
      "관리자는 로그인 후 새 근무표를 만들 수 있습니다.",
      "직원은 회원가입 또는 로그인 후 초대코드로 참여 요청을 보냅니다.",
      "관리자가 참여 요청을 승인해야 직원이 근무표를 볼 수 있습니다.",
    ],
  },
  {
    title: "기본 설정",
    items: [
      "직원 관리에서 근무표에 표시할 직원을 등록합니다.",
      "설정에서 오전, 오후, 야간, 휴무, 연차 같은 근무유형을 등록합니다.",
      "근무로 집계되는 유형은 기본 시작시간과 종료시간을 입력합니다.",
    ],
  },
  {
    title: "일정 등록",
    items: [
      "달력에서 날짜를 선택한 뒤 직원별 근무유형을 저장합니다.",
      "근무유형을 선택하면 설정에 저장된 시간이 자동 적용됩니다.",
      "휴무, 연차/휴가, 기타 비근무는 근무시간에서 제외됩니다.",
    ],
  },
  {
    title: "반복과 복사",
    items: [
      "반복 등록은 요일별 근무를 여러 날짜에 한 번에 넣을 때 사용합니다.",
      "패턴 템플릿은 자주 쓰는 주간 근무표를 저장해두는 기능입니다.",
      "근무표 복사는 같은 요일 기준으로 기존 스케줄을 재사용합니다.",
    ],
  },
  {
    title: "통계 기준",
    items: [
      "통계는 주간, 월별, 기간별로 확인할 수 있습니다.",
      "직원을 선택하면 해당 직원의 근무시간과 비근무 내역을 볼 수 있습니다.",
      "야간근로는 오후 10시부터 다음 날 오전 6시까지 겹치는 시간만 계산합니다.",
    ],
  },
];

function HelpPage() {
  return (
    <div style={{ padding: "6px" }}>
      <section
        style={{
          background: "#fff",
          border: "1px solid #e9ecef",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            color: "#868e96",
            fontSize: "12px",
            fontWeight: "800",
            marginBottom: "4px",
          }}
        >
          ShiftMate
        </div>

        <h2
          style={{
            color: "#191f28",
            fontSize: "20px",
            lineHeight: "1.25",
            marginBottom: "8px",
          }}
        >
          사용 가이드
        </h2>

        <p
          style={{
            color: "#495057",
            fontSize: "13px",
            fontWeight: "700",
            lineHeight: "1.55",
          }}
        >
          로그인부터 초대, 일정 등록, 통계 확인까지 기본 흐름만 정리했습니다.
        </p>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {guideSections.map((section, sectionIndex) => (
          <section
            key={section.title}
            style={{
              background: "#fff",
              border: "1px solid #e9ecef",
              borderRadius: "16px",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "999px",
                  background: "#edf4ff",
                  color: "#3182f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "900",
                  flexShrink: 0,
                }}
              >
                {sectionIndex + 1}
              </div>

              <h3 style={{ fontSize: "16px", color: "#191f28" }}>
                {section.title}
              </h3>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {section.items.map((item) => (
                <div
                  key={item}
                  style={{
                    color: "#495057",
                    background: "#f8f9fb",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "13px",
                    fontWeight: "700",
                    lineHeight: "1.45",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link
        to="/settings"
        style={{
          display: "block",
          marginTop: "12px",
          padding: "14px",
          borderRadius: "12px",
          background: "#3182f6",
          color: "#fff",
          textAlign: "center",
          textDecoration: "none",
          fontSize: "15px",
          fontWeight: "800",
        }}
      >
        설정으로 돌아가기
      </Link>
    </div>
  );
}

export default HelpPage;
