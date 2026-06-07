import { Link } from "react-router-dom";

const guideSections = [
  {
    title: "시작하기",
    items: [
      "관리자는 로그인 후 새 근무표를 만들 수 있습니다.",
      "직원은 초대코드를 입력하면 로그인 이메일로 자동 매칭되어 참여 요청을 보냅니다.",
      "관리자는 요청 이메일과 매칭된 직원 정보를 확인한 뒤 승인합니다.",
      "승인된 직원은 달력에서 내 근무표와 전체 근무표를 전환해 볼 수 있습니다.",
    ],
  },
  {
    title: "기본 설정",
    items: [
      "직원 관리에서 근무표에 표시할 직원명과 로그인 이메일을 등록합니다.",
      "직원 이메일은 계정 연결과 본인 통계 조회에 사용됩니다.",
      "근무가 끝난 직원은 삭제 대신 이전 직원으로 변경하면 과거 기록이 유지됩니다.",
      "이전 직원은 새 일정 등록에는 보이지 않지만, 근무 기록이 있는 기간의 통계에는 표시됩니다.",
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
      "직원 계정은 본인에게 연결된 직원의 통계만 볼 수 있습니다.",
      "직원을 선택하면 해당 직원의 근무시간과 비근무 내역을 볼 수 있습니다.",
      "이전 직원이라도 선택한 기간에 스케줄이 있으면 통계에 포함됩니다.",
      "야간근로는 오후 10시부터 다음 날 오전 6시까지 겹치는 시간만 계산합니다.",
    ],
  },
  {
    title: "직원 정리",
    items: [
      "이전 직원 보기에서 다시 사용을 누르면 현재 직원으로 복구됩니다.",
      "이전 직원을 삭제할 때는 과거 기록을 유지할지, 스케줄까지 함께 삭제할지 선택합니다.",
      "기록 유지를 선택하면 직원 관리 목록에서만 숨겨지고 과거 달력과 통계는 남습니다.",
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
          로그인부터 초대, 일정 등록, 직원 정리, 통계 확인까지 기본 흐름만
          정리했습니다.
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
