import { useState } from "react";
import dayjs from "dayjs";

const NIGHT_WORK_RANGES = [
  [0, 6 * 60],
  [22 * 60, 30 * 60],
];

function StatsPage({
  schedules = {},
  employees = [],
  memberRole,
  currentEmployeeId,
}) {
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
  const selectedPeriodLabel = getPeriodLabel({
    mode,
    selectedMonth,
    periodStart,
    periodEnd,
  });
  const isAdmin = memberRole === "ADMIN";
  const currentEmployee = employees.find(
    (employee) => String(employee.id) === String(currentEmployeeId),
  );
  const currentEmployeeName = currentEmployee?.name || "";
  const effectiveSelectedEmployee = isAdmin
    ? selectedEmployee
    : currentEmployeeName || "__NO_LINKED_EMPLOYEE__";

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
            effectiveSelectedEmployee === "ALL" ||
            schedule.name === effectiveSelectedEmployee,
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

  const isEmployeeSelected = effectiveSelectedEmployee !== "ALL";
  const allEmployeeStats = (
    isEmployeeSelected
      ? [
          [
            effectiveSelectedEmployee,
            stats.byEmployee[effectiveSelectedEmployee] ||
              createEmptyEmployeeStat(),
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
  const selectableEmployees = employees.filter((employee) => {
    const isActive = employee.isActive !== false && !employee.deletedAt;
    const hasActivity =
      stats.byEmployee[employee.name]?.work > 0 ||
      stats.byEmployee[employee.name]?.nonWork > 0;

    return isActive || hasActivity || employee.name === selectedEmployee;
  });
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
      {selectableEmployees.map((employee) => (
        <option key={employee.id} value={employee.name}>
          {employee.name}
          {employee.isActive === false ? " · 이전" : ""}
        </option>
      ))}
    </select>
  );
  const employeeFilterControl = isAdmin ? (
    employeeSelect
  ) : (
    <div
      style={{
        ...inputStyle,
        alignItems: "center",
        background: "#f8f9fb",
        display: "flex",
        fontWeight: "900",
      }}
    >
      {currentEmployeeName
        ? `내 통계 · ${currentEmployeeName}`
        : "직원 연결 없음"}
    </div>
  );

  const hasNightWork = visibleStats.totalNightWorkMinutes > 0;
  const hasWeekendWork = visibleStats.totalWeekendWork > 0;

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
                value: `${visibleStats.totalWeekendWork}건`,
                detail: formatMinutes(visibleStats.totalWeekendWorkMinutes),
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
          label: "비근무",
          value: `${visibleStats.totalNonWork}건`,
          detail: formatNonWorkSummaryDetails(visibleStats.totalNonWorkDetails),
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
          label: "비근무",
          value: `${visibleStats.totalNonWork}건`,
          detail: formatNonWorkSummaryDetails(visibleStats.totalNonWorkDetails),
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
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
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
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: "6px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ minWidth: 0 }}>{employeeFilterControl}</div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
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
          <div style={{ marginTop: "10px" }}>{employeeFilterControl}</div>
        )}
      </section>

      {!isEmployeeSelected && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "5px",
            marginBottom: "10px",
          }}
        >
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} card={card} />
          ))}
        </section>
      )}

      {isEmployeeSelected && (
        <PersonalStatsPanel
          periodLabel={selectedPeriodLabel}
          stats={visibleStats}
          hasNightWork={hasNightWork}
          hasWeekendWork={hasWeekendWork}
        />
      )}

      {!isEmployeeSelected && (
        <section
          style={{
            background: "#fff",
            border: "1px solid #e9ecef",
            borderRadius: "16px",
            padding: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "18px" }}>직원별 통계</h2>
            <div
              style={{
                background: "#f1f3f5",
                borderRadius: "999px",
                color: "#868e96",
                flexShrink: 0,
                fontSize: "11px",
                fontWeight: "900",
                padding: "5px 9px",
              }}
            >
              {employeeStats.length}명
            </div>
          </div>

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
                  hasWeekendWork={hasWeekendWork}
                />
              ))}
            </div>
          )}
        </section>
      )}
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

function formatNonWorkSummaryDetails(details) {
  const entries = getSortedNonWorkEntries(details);

  if (entries.length === 0) return "";

  const visibleEntries = entries.slice(0, 2);
  const summary = visibleEntries
    .map(([label, count]) => `${label} ${count}`)
    .join(" / ");

  return entries.length <= 2 ? summary : `${summary} 외`;
}

function getNonWorkDetailEntries(details) {
  return getSortedNonWorkEntries(details);
}

function getSortedNonWorkEntries(details) {
  return Object.entries(details)
    .filter(([, count]) => count > 0)
    .sort(([labelA], [labelB]) => {
      const orderA = getNonWorkLabelOrder(labelA);
      const orderB = getNonWorkLabelOrder(labelB);

      if (orderA !== orderB) return orderA - orderB;

      return labelA.localeCompare(labelB, "ko");
    });
}

function getNonWorkLabelOrder(label) {
  const normalizedLabel = label.toUpperCase();

  if (normalizedLabel === "OFF" || label === "휴무") return 0;
  if (label.includes("연차") || label.includes("휴가")) return 1;

  return 2;
}

function getPeriodLabel({ mode, selectedMonth, periodStart, periodEnd }) {
  if (mode === "month") {
    return dayjs(`${selectedMonth}-01`).format("YYYY년 M월");
  }

  return `${formatDateLabel(periodStart)} - ${formatDateLabel(periodEnd)}`;
}

function formatDateLabel(date) {
  return dayjs(date).format("M.D");
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
        background: "#fff",
        border: "1px solid #edf0f2",
        borderRadius: "10px",
        boxShadow: "0 1px 4px rgba(25, 31, 40, 0.04)",
        padding: "8px",
        minHeight: "54px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          color: "#495057",
          display: "flex",
          fontSize: "11px",
          fontWeight: "900",
          gap: "5px",
          lineHeight: "1.35",
          minWidth: 0,
        }}
      >
        <span
          style={{
            alignItems: "center",
            display: "flex",
            gap: "5px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              background: card.color,
              borderRadius: "999px",
              display: "inline-block",
              flexShrink: 0,
              height: "6px",
              width: "6px",
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {card.label}
          </span>
        </span>
      </div>

      <div
        style={{
          alignItems: "flex-end",
          color: card.color,
          display: "flex",
          fontSize: "20px",
          fontWeight: "900",
          gap: "6px",
          lineHeight: "1",
          minWidth: 0,
        }}
      >
        <span style={{ flexShrink: 0 }}>{card.value}</span>
        {card.detail && (
          <span
            style={{
              color: "#868e96",
              fontSize: "10px",
              fontWeight: "800",
              lineHeight: "1.15",
              minWidth: 0,
              overflow: "hidden",
              paddingBottom: "1px",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={card.detail}
          >
            {card.detail}
          </span>
        )}
      </div>
    </div>
  );
}

function PersonalStatsPanel({
  periodLabel,
  stats,
  hasNightWork,
  hasWeekendWork,
}) {
  const nonWorkDetails = getSortedNonWorkEntries(stats.totalNonWorkDetails);
  const nonWorkDetailText =
    nonWorkDetails.length > 0
      ? nonWorkDetails.map(([label, count]) => `${label} ${count}`).join(" / ")
      : "없음";
  const averageWorkMinutes =
    stats.totalWork > 0
      ? Math.round(stats.totalWorkMinutes / stats.totalWork)
      : 0;

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #edf0f2",
        borderRadius: "16px",
        marginBottom: "10px",
        padding: "16px",
      }}
    >
      {stats.totalWork === 0 && stats.totalNonWork === 0 ? (
        <div
          style={{
            background: "#f8f9fb",
            borderRadius: "10px",
            color: "#868e96",
            fontSize: "13px",
            fontWeight: "800",
            padding: "14px",
            textAlign: "center",
          }}
        >
          선택한 기간에 등록된 스케줄이 없습니다.
        </div>
      ) : (
        <>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#191f28",
                  fontSize: "16px",
                  fontWeight: "900",
                  lineHeight: "1.2",
                }}
              >
                이번 기간 근무 요약
              </div>
              <div
                style={{
                  color: "#868e96",
                  fontSize: "11px",
                  fontWeight: "800",
                  marginTop: "3px",
                }}
              >
                {periodLabel}
              </div>
            </div>
            <div
              style={{
                background: "#edf4ff",
                borderRadius: "999px",
                color: "#1971c2",
                flexShrink: 0,
                fontSize: "11px",
                fontWeight: "900",
                padding: "6px 9px",
              }}
            >
              근무 {stats.totalWork}건
            </div>
          </div>

          <div
            style={{
              background: "#f8fbf9",
              borderRadius: "14px",
              marginBottom: "12px",
              padding: "14px",
            }}
          >
            <div
              style={{
                color: "#868e96",
                fontSize: "11px",
                fontWeight: "900",
                marginBottom: "7px",
              }}
            >
              총 근무시간
            </div>
            <div
              style={{
                alignItems: "flex-end",
                color: "#2b8a3e",
                display: "flex",
                gap: "8px",
                lineHeight: "1",
                minWidth: 0,
              }}
            >
              <strong style={{ fontSize: "34px", fontWeight: "900" }}>
                {formatMinutes(stats.totalWorkMinutes)}
              </strong>
              <span
                style={{
                  color: "#868e96",
                  fontSize: "12px",
                  fontWeight: "800",
                  paddingBottom: "2px",
                }}
              >
                {stats.totalWork}건
              </span>
            </div>
            <div
              style={{
                color: "#868e96",
                fontSize: "12px",
                fontWeight: "800",
                marginTop: "8px",
              }}
            >
              {stats.totalWork}번 근무 · 평균{" "}
              {formatMinutes(averageWorkMinutes)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {hasWeekendWork && (
              <PersonalReportRow
                label="주말근무"
                value={`${stats.totalWeekendWork}건`}
                detail={`${getRatio(stats.totalWeekendWork, stats.totalWork)}% · ${formatMinutes(stats.totalWeekendWorkMinutes)}`}
                color="#364fc7"
              />
            )}
            {hasNightWork && (
              <PersonalReportRow
                label="야간근로"
                value={formatMinutes(stats.totalNightWorkMinutes)}
                detail={`${getRatio(stats.totalNightWorkMinutes, stats.totalWorkMinutes)}%`}
                color="#7048e8"
              />
            )}
            <PersonalReportRow
              label="비근무"
              value={`${stats.totalNonWork}건`}
              detail={nonWorkDetailText}
              color="#f76707"
            />
          </div>
        </>
      )}
    </section>
  );
}

function getRatio(part, total) {
  if (!total) return 0;

  return Math.round((part / total) * 100);
}

function PersonalReportRow({ label, value, detail, color }) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "grid",
        gridTemplateColumns: "74px minmax(0, 1fr)",
        gap: "8px",
        minWidth: 0,
        padding: "1px 0",
      }}
    >
      <div
        style={{
          color: "#495057",
          fontSize: "12px",
          fontWeight: "900",
        }}
      >
        {label}
      </div>
      <div
        style={{
          alignItems: "flex-end",
          color,
          display: "flex",
          fontSize: "14px",
          fontWeight: "900",
          gap: "5px",
          lineHeight: "1.15",
          minWidth: 0,
        }}
      >
        <span style={{ flexShrink: 0 }}>{value}</span>
        {detail && (
          <span
            style={{
              color: "#868e96",
              fontSize: "11px",
              fontWeight: "800",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={detail}
          >
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}

function EmployeeStatCard({
  name,
  employee,
  hasNightWork,
  hasWeekendWork,
  variant = "list",
}) {
  const isDetail = variant === "detail";
  const nonWorkDetails = getNonWorkDetailEntries(employee.nonWorkDetails);
  const statColumnCount = 3 + (hasWeekendWork ? 1 : 0) + (hasNightWork ? 1 : 0);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e9ecef",
        borderRadius: isDetail ? "14px" : "10px",
        boxShadow: isDetail ? "0 1px 4px rgba(25, 31, 40, 0.04)" : "none",
        padding: isDetail ? "14px" : "9px",
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
            fontSize: isDetail ? "18px" : "16px",
            fontWeight: "900",
            marginBottom: isDetail ? "12px" : 0,
          }}
        >
          {name}
        </div>

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${statColumnCount}, minmax(0, 1fr))`,
            gap: isDetail ? "6px" : "3px",
          }}
        >
          <CompactStat
            label="근무"
            value={`${employee.work}`}
            color="#3182f6"
          />
          <CompactStat
            label="시간"
            value={formatCompactMinutes(employee.workMinutes)}
            color="#2b8a3e"
          />
          {hasWeekendWork && (
            <CompactStat
              label="주말"
              value={`${employee.weekendWork}`}
              detail={formatCompactMinutes(employee.weekendWorkMinutes)}
              color="#364fc7"
            />
          )}
          {hasNightWork && (
            <CompactStat
              label="야간근로"
              value={formatCompactMinutes(employee.nightWorkMinutes)}
              color="#7048e8"
            />
          )}
          <CompactStat
            label="비근무"
            value={`${employee.nonWork}`}
            color="#f76707"
          />
        </div>
      </div>

      {nonWorkDetails.length > 0 && (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "5px",
            marginTop: isDetail ? "10px" : "6px",
          }}
        >
          <span
            style={{
              color: "#868e96",
              fontSize: isDetail ? "11px" : "10px",
              fontWeight: "800",
            }}
          >
            상세
          </span>
          {nonWorkDetails.map(([label, count]) => (
            <span
              key={label}
              style={{
                color: "#d9480f",
                fontSize: isDetail ? "11px" : "10px",
                fontWeight: "900",
                lineHeight: "1.2",
                whiteSpace: "nowrap",
              }}
            >
              {label} {count}
            </span>
          ))}
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
        padding: "6px 3px",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#868e96",
          fontSize: "9px",
          fontWeight: "700",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: "14px",
          fontWeight: "900",
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
  minWidth: 0,
  minHeight: "38px",
  padding: "8px 7px",
  paddingRight: "24px",
  background: "#fff",
  borderRadius: "10px",
  border: "1px solid #dfe3e8",
  color: "#191f28",
  fontSize: "11px",
  fontWeight: "800",
  lineHeight: "1.2",
  opacity: 1,
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
