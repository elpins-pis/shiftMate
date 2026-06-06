import { useState } from "react";
import dayjs from "dayjs";

const NIGHT_WORK_RANGES = [
  [0, 6 * 60],
  [22 * 60, 30 * 60],
];

function StatsPage({ schedules = {}, employees = [] }) {
  const [mode, setMode] = useState("month");
  const [selectedEmployee, setSelectedEmployee] = useState("ALL");
  const [selectedWeekStartDate, setSelectedWeekStartDate] = useState(
    getWeekStart(dayjs().format("YYYY-MM-DD")).format("YYYY-MM-DD"),
  );
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [startDate, setStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );

  const selectedWeekStart = dayjs(selectedWeekStartDate);
  const selectedWeekEnd = selectedWeekStart.add(6, "day");
  const periodStart =
    mode === "week"
      ? selectedWeekStart.format("YYYY-MM-DD")
      : mode === "range"
        ? startDate
        : null;
  const periodEnd =
    mode === "week"
      ? selectedWeekEnd.format("YYYY-MM-DD")
      : mode === "range"
        ? endDate
        : null;

  const filteredSchedules = Object.entries(schedules).flatMap(
    ([date, dailySchedules]) => {
      const isIncluded =
        mode === "month"
          ? date.startsWith(selectedMonth)
          : date >= periodStart && date <= periodEnd;

      if (!isIncluded) return [];

      return dailySchedules
        .filter(
          (schedule) =>
            selectedEmployee === "ALL" || schedule.name === selectedEmployee,
        )
        .map((schedule) => ({
          ...schedule,
          date,
        }));
    },
  );

  const stats = filteredSchedules.reduce(
    (acc, schedule) => {
      const employeeName = schedule.name || "이름 없음";
      const category = getScheduleCategory(schedule);
      const workMinutes = getWorkMinutes(schedule);
      const nightWorkMinutes = getNightWorkMinutes(schedule);
      const isWeekendWork = category === "WORK" && isWeekend(schedule.date);

      if (!acc.byEmployee[employeeName]) {
        acc.byEmployee[employeeName] = {
          work: 0,
          workMinutes: 0,
          nightWorkMinutes: 0,
          weekendWork: 0,
          weekendWorkMinutes: 0,
          nonWork: 0,
          nonWorkDetails: {},
        };
      }

      if (category === "WORK") {
        acc.totalWork += 1;
        acc.totalWorkMinutes += workMinutes;
        acc.totalNightWorkMinutes += nightWorkMinutes;

        if (isWeekendWork) {
          acc.totalWeekendWork += 1;
          acc.totalWeekendWorkMinutes += workMinutes;
          acc.byEmployee[employeeName].weekendWork += 1;
          acc.byEmployee[employeeName].weekendWorkMinutes += workMinutes;
        }

        acc.byEmployee[employeeName].work += 1;
        acc.byEmployee[employeeName].workMinutes += workMinutes;
        acc.byEmployee[employeeName].nightWorkMinutes += nightWorkMinutes;
      } else {
        const nonWorkLabel = schedule.type || "비근무";

        acc.totalNonWork += 1;
        acc.totalNonWorkDetails[nonWorkLabel] =
          (acc.totalNonWorkDetails[nonWorkLabel] || 0) + 1;
        acc.byEmployee[employeeName].nonWork += 1;
        acc.byEmployee[employeeName].nonWorkDetails[nonWorkLabel] =
          (acc.byEmployee[employeeName].nonWorkDetails[nonWorkLabel] || 0) + 1;
      }

      return acc;
    },
    {
      totalWork: 0,
      totalWorkMinutes: 0,
      totalNightWorkMinutes: 0,
      totalWeekendWork: 0,
      totalWeekendWorkMinutes: 0,
      totalNonWork: 0,
      totalNonWorkDetails: {},
      byEmployee: {},
    },
  );

  const selectedEmployeeLabel =
    selectedEmployee === "ALL" ? "전체 직원" : selectedEmployee;
  const isEmployeeSelected = selectedEmployee !== "ALL";
  const allEmployeeStats = (
    isEmployeeSelected
      ? [
          [
            selectedEmployee,
            stats.byEmployee[selectedEmployee] || createEmptyEmployeeStat(),
          ],
        ]
      : employees.length > 0
        ? employees.map((employee) => [
            employee.name,
            stats.byEmployee[employee.name] || createEmptyEmployeeStat(),
          ])
        : Object.entries(stats.byEmployee)
  ).sort(sortEmployeeStats);
  const employeesWithActivity = allEmployeeStats.filter(
    ([, employee]) => employee.work > 0 || employee.nonWork > 0,
  );
  const employeeStats = employeesWithActivity;
  const visibleStats = aggregateEmployeeStats(employeeStats);
  const employeesWithWorkTime = employeeStats.filter(
    ([, employee]) => employee.workMinutes > 0,
  );
  const averageEmployeeCount = isEmployeeSelected
    ? 1
    : employeesWithWorkTime.length;
  const averageWorkMinutes =
    averageEmployeeCount > 0
      ? Math.round(visibleStats.totalWorkMinutes / averageEmployeeCount)
      : 0;
  const employeeSelect = (
    <select
      value={selectedEmployee}
      onChange={(e) => setSelectedEmployee(e.target.value)}
      style={inputStyle}
    >
      <option value="ALL">전체 직원</option>
      {employees.map((employee) => (
        <option key={employee.id} value={employee.name}>
          {employee.name}
        </option>
      ))}
    </select>
  );

  const hasNightWork = visibleStats.totalNightWorkMinutes > 0;

  const summaryCards = isEmployeeSelected
    ? [
        {
          label: "근무",
          value: `${visibleStats.totalWork}건`,
          color: "#3182f6",
          background: "#edf4ff",
        },
        {
          label: "근무시간",
          value: formatMinutes(visibleStats.totalWorkMinutes),
          color: "#2b8a3e",
          background: "#ebfbee",
        },
        ...(visibleStats.totalWeekendWorkMinutes > 0
          ? [
              {
                label: "주말근무",
                value: formatMinutes(visibleStats.totalWeekendWorkMinutes),
                detail: `${visibleStats.totalWeekendWork}건`,
                color: "#364fc7",
                background: "#eef2ff",
              },
            ]
          : []),
        ...(hasNightWork
          ? [
              {
                label: "야간근로",
                value: formatMinutes(visibleStats.totalNightWorkMinutes),
                color: "#7048e8",
                background: "#f3f0ff",
              },
            ]
          : []),
        {
          label: "휴무/연차/기타",
          value: `${visibleStats.totalNonWork}건`,
          detail: formatNonWorkDetails(visibleStats.totalNonWorkDetails),
          color: "#f76707",
          background: "#fff4e6",
        },
      ]
    : [
        {
          label: "총 근무시간",
          value: formatMinutes(visibleStats.totalWorkMinutes),
          color: "#2b8a3e",
          background: "#ebfbee",
        },
        {
          label: "평균 근무시간",
          value: formatMinutes(averageWorkMinutes),
          detail: `${averageEmployeeCount}명 기준`,
          color: "#3182f6",
          background: "#edf4ff",
        },
        ...(hasNightWork
          ? [
              {
                label: "야간근로",
                value: formatMinutes(visibleStats.totalNightWorkMinutes),
                color: "#7048e8",
                background: "#f3f0ff",
              },
            ]
          : []),
        {
          label: "휴무/연차/기타",
          value: `${visibleStats.totalNonWork}건`,
          detail: formatNonWorkDetails(visibleStats.totalNonWorkDetails),
          color: "#f76707",
          background: "#fff4e6",
        },
      ];

  return (
    <div style={{ padding: "6px" }}>
      <section
        style={{
          background: "#fff",
          border: "1px solid #e9ecef",
          borderRadius: "14px",
          padding: "12px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          <button
            onClick={() => setMode("week")}
            style={getModeButtonStyle(mode === "week")}
          >
            주간 통계
          </button>
          <button
            onClick={() => setMode("month")}
            style={getModeButtonStyle(mode === "month")}
          >
            월별 통계
          </button>
          <button
            onClick={() => setMode("range")}
            style={getModeButtonStyle(mode === "range")}
          >
            기간별 통계
          </button>
        </div>

        {mode === "week" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setSelectedWeekStartDate(e.target.value)}
              style={inputStyle}
            />
            <input
              type="date"
              value={periodEnd}
              onChange={(e) =>
                setSelectedWeekStartDate(
                  dayjs(e.target.value).subtract(6, "day").format("YYYY-MM-DD"),
                )
              }
              style={inputStyle}
            />
          </div>
        ) : mode === "month" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              {employeeSelect}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {mode !== "month" && (
          <div style={{ marginTop: "10px" }}>
            {employeeSelect}
          </div>
        )}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} card={card} />
        ))}
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e9ecef",
          borderRadius: "14px",
          padding: "12px",
        }}
      >
        <h2 style={{ fontSize: "17px", marginBottom: "10px" }}>
          {isEmployeeSelected ? `${selectedEmployeeLabel} 상세` : "직원별 통계"}
        </h2>

        {employeeStats.length === 0 ? (
          <div
            style={{
              color: "#868e96",
              background: "#f8f9fb",
              borderRadius: "12px",
              padding: "18px",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
            선택한 기간에 등록된 스케줄이 없습니다.
          </div>
        ) : isEmployeeSelected ? (
          <EmployeeStatCard
            name={employeeStats[0][0]}
            employee={employeeStats[0][1]}
            hasNightWork={hasNightWork}
            variant="detail"
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "460px",
              overflowY: "auto",
              paddingRight: "2px",
            }}
          >
            {employeeStats.map(([name, employee]) => (
              <EmployeeStatCard
                key={name}
                name={name}
                employee={employee}
                hasNightWork={hasNightWork}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getWorkMinutes(schedule) {
  if (getScheduleCategory(schedule) !== "WORK") return 0;
  if (!schedule.startTime || !schedule.endTime) return 0;

  const start = parseTimeToMinutes(schedule.startTime);
  let end = parseTimeToMinutes(schedule.endTime);

  if (start === null || end === null) return 0;
  if (end <= start) end += 24 * 60;

  return end - start;
}

function getNightWorkMinutes(schedule) {
  if (getScheduleCategory(schedule) !== "WORK") return 0;
  if (!schedule.startTime || !schedule.endTime) return 0;

  const start = parseTimeToMinutes(schedule.startTime);
  let end = parseTimeToMinutes(schedule.endTime);

  if (start === null || end === null) return 0;
  if (end <= start) end += 24 * 60;

  return NIGHT_WORK_RANGES.reduce((total, [nightStart, nightEnd]) => {
    const overlapStart = Math.max(start, nightStart);
    const overlapEnd = Math.min(end, nightEnd);

    return total + Math.max(overlapEnd - overlapStart, 0);
  }, 0);
}

function getScheduleCategory(schedule) {
  if (schedule.category) return schedule.category;
  if (schedule.type === "OFF") return "OFF";
  if (schedule.type === "연차") return "VACATION";

  return "WORK";
}

function isWeekend(date) {
  const day = dayjs(date).day();

  return day === 0 || day === 6;
}

function createEmptyEmployeeStat() {
  return {
    work: 0,
    workMinutes: 0,
    nightWorkMinutes: 0,
    weekendWork: 0,
    weekendWorkMinutes: 0,
    nonWork: 0,
    nonWorkDetails: {},
  };
}

function sortEmployeeStats([nameA, employeeA], [nameB, employeeB]) {
  if (employeeB.workMinutes !== employeeA.workMinutes) {
    return employeeB.workMinutes - employeeA.workMinutes;
  }

  if (employeeB.work !== employeeA.work) {
    return employeeB.work - employeeA.work;
  }

  return nameA.localeCompare(nameB, "ko");
}

function aggregateEmployeeStats(employeeStats) {
  return employeeStats.reduce(
    (acc, [, employee]) => {
      acc.totalWork += employee.work;
      acc.totalWorkMinutes += employee.workMinutes;
      acc.totalNightWorkMinutes += employee.nightWorkMinutes;
      acc.totalWeekendWork += employee.weekendWork;
      acc.totalWeekendWorkMinutes += employee.weekendWorkMinutes;
      acc.totalNonWork += employee.nonWork;

      Object.entries(employee.nonWorkDetails).forEach(([label, count]) => {
        acc.totalNonWorkDetails[label] =
          (acc.totalNonWorkDetails[label] || 0) + count;
      });

      return acc;
    },
    {
      totalWork: 0,
      totalWorkMinutes: 0,
      totalNightWorkMinutes: 0,
      totalWeekendWork: 0,
      totalWeekendWorkMinutes: 0,
      totalNonWork: 0,
      totalNonWorkDetails: {},
    },
  );
}

function formatNonWorkDetails(details) {
  const entries = Object.entries(details);

  if (entries.length === 0) return "";

  return entries.map(([label, count]) => `${label} ${count}`).join(" / ");
}

function getWeekStart(date) {
  const selectedDate = dayjs(date);
  const daysFromMonday = (selectedDate.day() + 6) % 7;

  return selectedDate.subtract(daysFromMonday, "day");
}

function parseTimeToMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return hour * 60 + minute;
}

function formatMinutes(minutes) {
  if (!minutes) return "0시간";

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;

  if (remainMinutes === 0) return `${hours}시간`;

  return `${hours}시간 ${remainMinutes}분`;
}

function formatCompactMinutes(minutes) {
  if (!minutes) return "0h";

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;

  if (remainMinutes === 0) return `${hours}h`;

  return `${hours}h${remainMinutes}m`;
}

function SummaryCard({ card }) {
  return (
    <div
      style={{
        background: card.background,
        border: "1px solid #e9ecef",
        borderRadius: "10px",
        padding: "11px 10px",
        minHeight: "76px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          color: "#495057",
          fontSize: "11px",
          fontWeight: "700",
          lineHeight: "1.35",
        }}
      >
        {card.label}
      </div>

      <div
        style={{
          color: card.color,
          fontSize: "21px",
          fontWeight: "800",
          lineHeight: "1.15",
        }}
      >
        {card.value}
      </div>
      {card.detail && (
        <div
          style={{
            color: "#868e96",
            fontSize: "10px",
            fontWeight: "700",
            marginTop: "4px",
            lineHeight: "1.2",
          }}
        >
          {card.detail}
        </div>
      )}
    </div>
  );
}

function EmployeeStatCard({ name, employee, hasNightWork, variant = "list" }) {
  const isDetail = variant === "detail";

  return (
    <div
      style={{
        background: "#f8f9fb",
        border: "1px solid #edf0f2",
        borderRadius: isDetail ? "14px" : "10px",
        padding: isDetail ? "14px" : "10px",
      }}
    >
      <div
        style={{
          display: isDetail ? "block" : "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            minWidth: "58px",
            fontSize: isDetail ? "18px" : "15px",
            fontWeight: "800",
            marginBottom: isDetail ? "12px" : 0,
          }}
        >
          {name}
        </div>

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${hasNightWork ? 4 : 3}, minmax(0, 1fr))`,
            gap: isDetail ? "6px" : "4px",
          }}
        >
          <CompactStat label="근무" value={`${employee.work}`} color="#3182f6" />
          <CompactStat
            label="시간"
            value={formatCompactMinutes(employee.workMinutes)}
            color="#2b8a3e"
          />
          {hasNightWork && (
            <CompactStat
              label="야간근로"
              value={formatCompactMinutes(employee.nightWorkMinutes)}
              color="#7048e8"
            />
          )}
          <CompactStat
            label="휴무/연차/기타"
            value={`${employee.nonWork}`}
            color="#f76707"
          />
        </div>
      </div>

      {employee.nonWork > 0 && (
        <div
          style={{
            color: "#868e96",
            fontSize: isDetail ? "12px" : "11px",
            fontWeight: "700",
            marginTop: isDetail ? "10px" : "6px",
            lineHeight: "1.35",
          }}
        >
          휴무/연차/기타: {formatNonWorkDetails(employee.nonWorkDetails)}
        </div>
      )}
    </div>
  );
}

function CompactStat({ label, value, detail, color }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #edf0f2",
        borderRadius: "8px",
        padding: "7px 4px",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#868e96",
          fontSize: "10px",
          fontWeight: "700",
          marginBottom: "3px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: "14px",
          fontWeight: "800",
          lineHeight: "1.15",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      {detail && (
        <div
          style={{
            color: "#868e96",
            fontSize: "9px",
            fontWeight: "700",
            lineHeight: "1.1",
            marginTop: "2px",
            whiteSpace: "nowrap",
          }}
        >
          {detail}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  fontSize: "13px",
};

function getModeButtonStyle(isActive) {
  return {
    border: "none",
    background: isActive ? "#3182f6" : "#f1f3f5",
    color: isActive ? "#fff" : "#495057",
    borderRadius: "10px",
    padding: "10px",
    fontWeight: "800",
    cursor: "pointer",
  };
}

export default StatsPage;
