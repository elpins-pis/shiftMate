import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { FiTrash2, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  deleteSchedule,
  saveSchedule,
  saveSchedules,
} from "../services/workspaceService";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function CalendarPage({
  workspace,
  shiftTypes,
  employees,
  schedules,
  setSchedules,
  patternTemplates = [],
  onDataChanged,
  canManage = true,
  memberRole,
  currentEmployeeId,
}) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRepeatFormOpen, setIsRepeatFormOpen] = useState(false);
  const [isCopyFormOpen, setIsCopyFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedShiftType, setSelectedShiftType] = useState("오전");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [editIndex, setEditIndex] = useState(null);
  const [repeatEmployee, setRepeatEmployee] = useState("");
  const [repeatStartDate, setRepeatStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [repeatEndDate, setRepeatEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );
  const [repeatShiftTypes, setRepeatShiftTypes] = useState(Array(7).fill(""));
  const [repeatApplyMode, setRepeatApplyMode] = useState("overwrite");
  const [repeatMode, setRepeatMode] = useState("direct");
  const [repeatWeekPatternIds, setRepeatWeekPatternIds] = useState([]);
  const [copyUnit, setCopyUnit] = useState("month");
  const [copySourceMonth, setCopySourceMonth] = useState(
    dayjs().subtract(1, "month").format("YYYY-MM"),
  );
  const [copyTargetMonth, setCopyTargetMonth] = useState(
    dayjs().format("YYYY-MM"),
  );
  const [copySourceWeekDate, setCopySourceWeekDate] = useState(
    dayjs().subtract(1, "week").format("YYYY-MM-DD"),
  );
  const [copyTargetWeekDate, setCopyTargetWeekDate] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [copySourceStartDate, setCopySourceStartDate] = useState(
    dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
  );
  const [copySourceEndDate, setCopySourceEndDate] = useState(
    dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD"),
  );
  const [copyTargetStartDate, setCopyTargetStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [copyTargetEndDate, setCopyTargetEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );
  const [copyEmployee, setCopyEmployee] = useState("ALL");
  const [copyApplyMode, setCopyApplyMode] = useState("overwrite");
  const [scheduleScope, setScheduleScope] = useState("mine");
  const activeEmployees = employees.filter(
    (employee) => employee.isActive !== false && !employee.deletedAt,
  );
  const isUser = memberRole === "USER";
  const currentEmployee = employees.find(
    (employee) => String(employee.id) === String(currentEmployeeId),
  );
  const shouldShowMineOnly =
    isUser && currentEmployeeId && scheduleScope === "mine";
  const visibleSchedules = shouldShowMineOnly
    ? filterSchedulesByEmployeeId(schedules, currentEmployeeId)
    : schedules;

  const startOfMonth = currentDate.startOf("month");
  const endOfMonth = currentDate.endOf("month");
  const startDay = startOfMonth.day();
  const daysInMonth = endOfMonth.date();

  const days = [];

  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const movePrevMonth = () => {
    setSelectedDate(null);
    setIsFormOpen(false);
    setIsRepeatFormOpen(false);
    setIsCopyFormOpen(false);
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  const moveNextMonth = () => {
    setSelectedDate(null);
    setIsFormOpen(false);
    setIsRepeatFormOpen(false);
    setIsCopyFormOpen(false);
    setCurrentDate(currentDate.add(1, "month"));
  };

  const isToday = (day) => {
    if (!day) return false;

    return (
      currentDate.date(day).format("YYYY-MM-DD") ===
      dayjs().format("YYYY-MM-DD")
    );
  };

  const getDayColor = (day, index) => {
    if (!day) return "#222";

    const dayOfWeek = index % 7;

    if (dayOfWeek === 0) return "#e03131";
    if (dayOfWeek === 6) return "#1971c2";

    return "#222";
  };

  const getShiftColor = (type) => {
    const shiftType = shiftTypes.find((item) => item.name === type);

    return shiftType ? shiftType.color : "#3182f6";
  };

  const getShiftIcon = (type) => {
    const shiftType = shiftTypes.find((item) => item.name === type);

    return shiftType ? shiftType.icon : "•";
  };

  const getShiftCategory = (type) => {
    const shiftType = shiftTypes.find((item) => item.name === type);

    return shiftType ? shiftType.category || "WORK" : "WORK";
  };

  const getShiftType = (type) =>
    shiftTypes.find((item) => item.name === type) || null;

  const createSchedule = (employeeName, type) => {
    const shiftType = getShiftType(type);
    const employee = employees.find((item) => item.name === employeeName);

    return {
      employeeId: employee?.id,
      shiftTypeId: shiftType?.id,
      name: employeeName,
      type,
      icon: shiftType?.icon || getShiftIcon(type),
      color: shiftType?.color || getShiftColor(type),
      category: shiftType?.category || getShiftCategory(type),
      startTime: shiftType?.startTime || "",
      endTime: shiftType?.endTime || "",
    };
  };

  const createScheduleFromExisting = (schedule) => {
    const shiftType = getShiftType(schedule.type);

    if (shiftType) {
      return createSchedule(schedule.name, shiftType.name);
    }

    return {
      ...schedule,
    };
  };

  const repeatWeeks = getWeekChunks(repeatStartDate, repeatEndDate);

  const handleOpenRepeatForm = () => {
    if (!canManage) return;

    setSelectedDate(null);
    setIsFormOpen(false);
    setIsCopyFormOpen(false);
    setRepeatEmployee("");
    setRepeatStartDate(currentDate.startOf("month").format("YYYY-MM-DD"));
    setRepeatEndDate(currentDate.endOf("month").format("YYYY-MM-DD"));
    setRepeatShiftTypes(Array(7).fill(""));
    setRepeatApplyMode("overwrite");
    setRepeatMode("direct");
    setRepeatWeekPatternIds([]);
    setIsRepeatFormOpen(true);
  };

  const handleOpenCopyForm = () => {
    if (!canManage) return;

    const sourceMonth = currentDate.subtract(1, "month");
    const targetMonth = currentDate;

    setSelectedDate(null);
    setIsFormOpen(false);
    setIsRepeatFormOpen(false);
    setCopyUnit("month");
    setCopySourceMonth(sourceMonth.format("YYYY-MM"));
    setCopyTargetMonth(targetMonth.format("YYYY-MM"));
    setCopySourceWeekDate(sourceMonth.startOf("month").format("YYYY-MM-DD"));
    setCopyTargetWeekDate(targetMonth.startOf("month").format("YYYY-MM-DD"));
    setCopySourceStartDate(sourceMonth.startOf("month").format("YYYY-MM-DD"));
    setCopySourceEndDate(sourceMonth.endOf("month").format("YYYY-MM-DD"));
    setCopyTargetStartDate(targetMonth.startOf("month").format("YYYY-MM-DD"));
    setCopyTargetEndDate(targetMonth.endOf("month").format("YYYY-MM-DD"));
    setCopyEmployee("ALL");
    setCopyApplyMode("overwrite");
    setIsCopyFormOpen(true);
  };

  const handleGoToPatternTemplate = () => {
    setIsRepeatFormOpen(false);
    navigate("/settings?openPattern=true");
  };

  const applyCopyMonthRange = (rangeType, month) => {
    if (!month) return;

    const startDate = dayjs(month).startOf("month").format("YYYY-MM-DD");
    const endDate = dayjs(month).endOf("month").format("YYYY-MM-DD");

    if (rangeType === "source") {
      setCopySourceMonth(month);
      setCopySourceStartDate(startDate);
      setCopySourceEndDate(endDate);
      return;
    }

    setCopyTargetMonth(month);
    setCopyTargetStartDate(startDate);
    setCopyTargetEndDate(endDate);
  };

  const applyCopyWeekRange = (rangeType, date) => {
    if (!date) return;

    const startDate = getWeekStart(date).format("YYYY-MM-DD");
    const endDate = getWeekStart(date).add(6, "day").format("YYYY-MM-DD");

    if (rangeType === "source") {
      setCopySourceWeekDate(date);
      setCopySourceStartDate(startDate);
      setCopySourceEndDate(endDate);
      return;
    }

    setCopyTargetWeekDate(date);
    setCopyTargetStartDate(startDate);
    setCopyTargetEndDate(endDate);
  };

  const handleCopyUnitChange = (unit) => {
    setCopyUnit(unit);

    if (unit === "month") {
      applyCopyMonthRange("source", copySourceMonth);
      applyCopyMonthRange("target", copyTargetMonth);
    }

    if (unit === "week") {
      applyCopyWeekRange("source", copySourceWeekDate);
      applyCopyWeekRange("target", copyTargetWeekDate);
    }
  };

  const handleSaveSchedule = async () => {
    if (!formDate) {
      alert("날짜가 선택되지 않았습니다.");
      return;
    }

    if (!selectedEmployee) {
      alert("직원을 선택해주세요.");
      return;
    }

    const newSchedule = createSchedule(selectedEmployee, selectedShiftType);

    try {
      if (workspace?.id) {
        const existingSchedule =
          editIndex !== null ? schedules[formDate]?.[editIndex] : null;

        await saveSchedule(workspace.id, formDate, newSchedule);

        if (
          existingSchedule?.id &&
          existingSchedule.employeeId !== newSchedule.employeeId
        ) {
          await deleteSchedule(existingSchedule.id);
        }

        onDataChanged?.();
      } else {
        setSchedules((prev) => {
          const currentList = [...(prev[formDate] || [])];

          if (editIndex !== null) {
            currentList[editIndex] = newSchedule;
          } else {
            currentList.push(newSchedule);
          }

          return {
            ...prev,
            [formDate]: currentList,
          };
        });
      }

      setSelectedEmployee("");
      setStartTime("");
      setEndTime("");
      setEditIndex(null);
      setIsFormOpen(false);
    } catch (error) {
      alert(error.message || "스케줄을 저장하지 못했습니다.");
    }
  };

  const handleSaveRepeatSchedules = async () => {
    if (!repeatEmployee) {
      alert("직원을 선택해주세요.");
      return;
    }

    if (!repeatStartDate || !repeatEndDate) {
      alert("기간을 선택해주세요.");
      return;
    }

    if (repeatEndDate < repeatStartDate) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    if (repeatMode === "direct" && !repeatShiftTypes.some(Boolean)) {
      alert("요일별 근무유형을 하나 이상 선택해주세요.");
      return;
    }

    if (
      repeatMode === "pattern" &&
      !repeatWeekPatternIds.some((patternId) => patternId)
    ) {
      alert("주차별 패턴을 하나 이상 선택해주세요.");
      return;
    }

    const repeatItems = getDateRange(repeatStartDate, repeatEndDate)
      .map((date) => {
        if (repeatMode === "direct") {
          return {
            date,
            shiftTypeName: repeatShiftTypes[dayjs(date).day()],
          };
        }

        const weekIndex = getWeekIndexInRange(date, repeatStartDate);
        const patternId = repeatWeekPatternIds[weekIndex];
        const pattern = patternTemplates.find(
          (item) => String(item.id) === String(patternId),
        );

        return {
          date,
          shiftTypeName: pattern?.days?.[dayjs(date).day()] || "",
        };
      })
      .filter((item) => item.shiftTypeName);

    const hasExistingSchedules = repeatItems.some(({ date }) =>
      (schedules[date] || []).some(
        (schedule) => schedule.name === repeatEmployee,
      ),
    );

    if (hasExistingSchedules && repeatApplyMode === "overwrite") {
      const confirmed = window.confirm(
        "선택한 기간에 이미 등록된 해당 직원의 스케줄이 있습니다. 덮어쓸까요?",
      );

      if (!confirmed) return;
    }

    try {
      if (workspace?.id) {
        await saveSchedules(
          workspace.id,
          repeatItems
            .filter(({ date }) => {
              const currentList = schedules[date] || [];
              const hasEmployeeSchedule = currentList.some(
                (schedule) => schedule.name === repeatEmployee,
              );

              return !(repeatApplyMode === "empty" && hasEmployeeSchedule);
            })
            .map(({ date, shiftTypeName }) => ({
              date,
              schedule: createSchedule(repeatEmployee, shiftTypeName),
            })),
        );
        onDataChanged?.();
      } else {
        setSchedules((prev) => {
          const nextSchedules = { ...prev };

          repeatItems.forEach(({ date, shiftTypeName }) => {
            const currentList = nextSchedules[date] || [];
            const hasEmployeeSchedule = currentList.some(
              (schedule) => schedule.name === repeatEmployee,
            );

            if (repeatApplyMode === "empty" && hasEmployeeSchedule) return;

            const filteredList =
              repeatApplyMode === "overwrite"
                ? currentList.filter(
                    (schedule) => schedule.name !== repeatEmployee,
                  )
                : currentList;

            nextSchedules[date] = [
              ...filteredList,
              createSchedule(repeatEmployee, shiftTypeName),
            ];
          });

          return nextSchedules;
        });
      }

      setIsRepeatFormOpen(false);
    } catch (error) {
      alert(error.message || "반복 스케줄을 저장하지 못했습니다.");
    }
  };

  const handleSaveCopiedSchedules = async () => {
    if (
      !copySourceStartDate ||
      !copySourceEndDate ||
      !copyTargetStartDate ||
      !copyTargetEndDate
    ) {
      alert("복사할 기간과 붙여넣을 기간을 선택해주세요.");
      return;
    }

    if (copySourceEndDate < copySourceStartDate) {
      alert("복사 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    if (copyTargetEndDate < copyTargetStartDate) {
      alert("붙여넣을 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    const copiedItems = getDateRange(copySourceStartDate, copySourceEndDate)
      .flatMap((sourceDate) => {
        const targetDate = getMatchingWeekdayDate(
          sourceDate,
          copySourceStartDate,
          copyTargetStartDate,
          copyTargetEndDate,
        );

        if (!targetDate) return [];

        return (schedules[sourceDate] || [])
          .filter(
            (schedule) =>
              copyEmployee === "ALL" || schedule.name === copyEmployee,
          )
          .map((schedule) => ({
            targetDate,
            schedule: createScheduleFromExisting(schedule),
          }));
      });

    if (copiedItems.length === 0) {
      alert("복사할 스케줄이 없습니다.");
      return;
    }

    const hasExistingSchedules = copiedItems.some(({ targetDate, schedule }) =>
      (schedules[targetDate] || []).some((item) => item.name === schedule.name),
    );

    if (hasExistingSchedules && copyApplyMode === "overwrite") {
      const confirmed = window.confirm(
        "붙여넣을 기간에 이미 등록된 스케줄이 있습니다. 덮어쓸까요?",
      );

      if (!confirmed) return;
    }

    try {
      if (workspace?.id) {
        await saveSchedules(
          workspace.id,
          copiedItems
            .filter(({ targetDate, schedule }) => {
              const currentList = schedules[targetDate] || [];
              const hasEmployeeSchedule = currentList.some(
                (item) => item.name === schedule.name,
              );

              return !(copyApplyMode === "empty" && hasEmployeeSchedule);
            })
            .map(({ targetDate, schedule }) => ({
              date: targetDate,
              schedule,
            })),
        );
        onDataChanged?.();
      } else {
        setSchedules((prev) => {
          const nextSchedules = { ...prev };

          copiedItems.forEach(({ targetDate, schedule }) => {
            const currentList = nextSchedules[targetDate] || [];
            const hasEmployeeSchedule = currentList.some(
              (item) => item.name === schedule.name,
            );

            if (copyApplyMode === "empty" && hasEmployeeSchedule) return;

            const filteredList =
              copyApplyMode === "overwrite"
                ? currentList.filter((item) => item.name !== schedule.name)
                : currentList;

            nextSchedules[targetDate] = [...filteredList, schedule];
          });

          return nextSchedules;
        });
      }

      setIsCopyFormOpen(false);
    } catch (error) {
      alert(error.message || "복사한 스케줄을 저장하지 못했습니다.");
    }
  };

  const handleDeleteSchedule = async (date, index) => {
    const targetSchedule = schedules[date]?.[index];

    try {
      if (workspace?.id && targetSchedule?.id) {
        await deleteSchedule(targetSchedule.id);
        onDataChanged?.();
        return;
      }

      setSchedules((prev) => {
        const updatedList = [...(prev[date] || [])];

        updatedList.splice(index, 1);

        return {
          ...prev,
          [date]: updatedList,
        };
      });
    } catch (error) {
      alert(error.message || "스케줄을 삭제하지 못했습니다.");
    }
  };

  const handleOpenEditForm = (date, index, schedule) => {
    if (!canManage) return;

    setFormDate(date);
    setSelectedEmployee(schedule.name);
    setSelectedShiftType(schedule.type);
    setEditIndex(index);
    setSelectedDate(null);
    setIsFormOpen(true);
    setStartTime(getShiftType(schedule.type)?.startTime || "");
    setEndTime(getShiftType(schedule.type)?.endTime || "");
  };

  return (
    <div>
      {canManage && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            marginBottom: "12px",
          }}
        >
          <button
            onClick={handleOpenRepeatForm}
            style={{
              border: "none",
              background: "#e7f5ff",
              color: "#1971c2",
              borderRadius: "10px",
              padding: "9px 12px",
              fontWeight: "800",
              fontSize: "14px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            반복 등록
          </button>

          <button
            onClick={handleOpenCopyForm}
            style={{
              background: "#fff",
              color: "#495057",
              border: "1px solid #e9ecef",
              borderRadius: "10px",
              padding: "9px 12px",
              fontWeight: "800",
              fontSize: "14px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            근무표 복사
          </button>
        </div>
      )}

      {isUser && currentEmployeeId && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: "6px",
            marginBottom: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => setScheduleScope("mine")}
            style={getSegmentButtonStyle(scheduleScope === "mine")}
          >
            내 근무표
          </button>
          <button
            type="button"
            onClick={() => setScheduleScope("all")}
            style={getSegmentButtonStyle(scheduleScope === "all")}
          >
            전체 보기
          </button>
        </div>
      )}

      {isUser && !currentEmployeeId && (
        <div
          style={{
            background: "#fff4e6",
            border: "1px solid #ffe8cc",
            borderRadius: "12px",
            color: "#d9480f",
            fontSize: "12px",
            fontWeight: "800",
            lineHeight: "1.4",
            marginBottom: "12px",
            padding: "10px",
          }}
        >
          직원 정보가 아직 연결되지 않았습니다. 관리자에게 직원 이메일 등록
          상태를 확인해주세요.
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={movePrevMonth}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            border: "1px solid #e9ecef",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <FiChevronLeft size={22} />
        </button>

        <h2 style={{ fontSize: "20px", fontWeight: "700" }}>
          {currentDate.format("YYYY년 M월")}
        </h2>

        <button
          onClick={moveNextMonth}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            border: "1px solid #e9ecef",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <FiChevronRight size={22} />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "5px",
          marginBottom: "10px",
        }}
      >
        {shiftTypes.map((shiftType) => (
          <div
            key={shiftType.name}
            style={{
              minWidth: "fit-content",
              background: "#f8f9fb",
              border: "1px solid #edf0f2",
              borderRadius: "999px",
              padding: "6px 8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "13px" }}>{shiftType.icon}</span>

            <span
              style={{
                color: "#191f28",
                fontSize: "11px",
                fontWeight: "800",
                whiteSpace: "nowrap",
              }}
            >
              {shiftType.name}
            </span>

            <span
              style={{
                color: "#868e96",
                fontSize: "10px",
                fontWeight: "700",
                whiteSpace: "nowrap",
              }}
            >
              {shiftType.startTime && shiftType.endTime
                ? formatShortTimeRange(shiftType.startTime, shiftType.endTime)
                : "비근무"}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          marginBottom: "10px",
          textAlign: "center",
          fontWeight: "bold",
        }}
      >
        <div style={{ color: "#e03131" }}>일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div style={{ color: "#1971c2" }}>토</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "2px",
        }}
      >
        {days.map((day, index) => {
          const dateKey = day
            ? currentDate.date(day).format("YYYY-MM-DD")
            : null;

          const daySchedules = dateKey ? visibleSchedules[dateKey] || [] : [];

          return (
            <div
              key={index}
              onClick={() => {
                if (!day) return;
                if (
                  selectedDate ||
                  isFormOpen ||
                  isRepeatFormOpen ||
                  isCopyFormOpen
                ) {
                  return;
                }

                setSelectedDate(dateKey);
              }}
              style={{
                height: "90px",
                background:
                  day && selectedDate === dateKey ? "#edf4ff" : "#f8f9fb",
                border:
                  day && selectedDate === dateKey
                    ? "2px solid #3182f6"
                    : "1px solid transparent",
                borderRadius: "8px",
                padding: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "600",
                  marginBottom: "4px",
                  fontSize: "12px",
                  color: isToday(day) ? "#fff" : getDayColor(day, index),
                  background: isToday(day) ? "#3182f6" : "transparent",
                }}
              >
                {day}
              </div>

              {day && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {daySchedules.map((schedule, idx) => (
                    <div
                      key={idx}
                      style={{
                        color: "#222",
                        fontSize: "10px",
                        lineHeight: "1.2",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {schedule.icon || getShiftIcon(schedule.type)}{" "}
                      {schedule.name}{" "}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div
          onClick={() => setSelectedDate(null)}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "calc(100% - 40px)",
              maxWidth: "360px",
              background: "#fff",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid #e9ecef",
              boxShadow: "none",
            }}
          >
            <button
              onClick={() => setSelectedDate(null)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "20px",
                float: "right",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <h3 style={{ marginBottom: "16px" }}>{selectedDate}</h3>

            {(visibleSchedules[selectedDate] || []).length === 0 ? (
              <div style={{ color: "#888", padding: "20px 0" }}>
                {scheduleScope === "mine" && currentEmployee?.name
                  ? `${currentEmployee.name}님의 스케줄이 없습니다.`
                  : "등록된 스케줄이 없습니다."}
              </div>
            ) : (
              <div
                style={{
                  maxHeight: "260px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {visibleSchedules[selectedDate].map((schedule, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#f8f9fb",
                      borderRadius: "12px",
                      padding: "14px",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      onClick={() =>
                        canManage &&
                        handleOpenEditForm(selectedDate, idx, schedule)
                      }
                      style={{
                        flex: 1,
                        cursor: canManage ? "pointer" : "default",
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>
                        {schedule.name}
                        {schedule.startTime && schedule.endTime && (
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "12px",
                              color: "#868e96",
                              fontWeight: "400",
                            }}
                          >
                            {schedule.startTime} ~ {schedule.endTime}
                          </span>
                        )}
                      </div>{" "}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          minWidth: "52px",
                          height: "28px",
                          borderRadius: "999px",

                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",

                          fontSize: "13px",
                          fontWeight: "bold",
                        }}
                      >
                        {schedule.icon || getShiftIcon(schedule.type)}{" "}
                        {schedule.type}
                      </div>

                      {canManage && (
                        <button
                          onClick={() => handleDeleteSchedule(selectedDate, idx)}
                          style={{
                            border: "none",
                            background: "#fff5f5",
                            color: "#fa5252",
                            borderRadius: "999px",
                            width: "32px",
                            height: "32px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canManage && (
              <button
                onClick={() => {
                  const defaultShiftType = shiftTypes[0];

                  setFormDate(selectedDate);
                  setSelectedEmployee("");
                  setSelectedShiftType(defaultShiftType?.name || "");
                  setStartTime(defaultShiftType?.startTime || "");
                  setEndTime(defaultShiftType?.endTime || "");
                  setEditIndex(null);
                  setSelectedDate(null);
                  setIsFormOpen(true);
                }}
                style={{
                  width: "100%",
                  marginTop: "16px",
                  border: "none",
                  background: "#3182f6",
                  color: "#fff",
                  borderRadius: "12px",
                  padding: "14px",
                  fontWeight: "bold",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                + 근무 등록
              </button>
            )}
          </div>
        </div>
      )}

      {isFormOpen && (
        <div
          onClick={() => setIsFormOpen(false)}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "calc(100% - 40px)",
              maxWidth: "360px",
              background: "#fff",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid #e9ecef",
              boxShadow: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3>{formDate} 근무 등록</h3>

              <button
                onClick={() => setIsFormOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: "6px",
                  alignItems: "start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ marginBottom: "6px", fontSize: "13px" }}>
                    직원명
                  </div>

                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    style={compactControlStyle}
                  >
                    <option value="">직원 선택</option>
                    {activeEmployees.map((employee) => (
                      <option key={employee.id} value={employee.name}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ marginBottom: "6px", fontSize: "13px" }}>
                    근무 유형
                  </div>

                  <select
                    value={selectedShiftType}
                    onChange={(e) => {
                      const selectedType = shiftTypes.find(
                        (item) => item.name === e.target.value,
                      );

                      setSelectedShiftType(e.target.value);

                      if (selectedType) {
                        setStartTime(selectedType.startTime || "");
                        setEndTime(selectedType.endTime || "");
                      }
                    }}
                    style={compactControlStyle}
                  >
                    {shiftTypes.map((shiftType) => (
                      <option key={shiftType.name} value={shiftType.name}>
                        {shiftType.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  color: "#868e96",
                  fontSize: "12px",
                  marginTop: "6px",
                  lineHeight: "1.35",
                }}
              >
                설정된 시간:{" "}
                {startTime && endTime
                  ? `${startTime} ~ ${endTime}`
                  : "시간 없음"}
              </div>
            </div>

            <button
              onClick={handleSaveSchedule}
              style={{
                width: "100%",
                border: "none",
                background: "#3182f6",
                color: "#fff",
                borderRadius: "12px",
                padding: "12px",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              저장
            </button>
          </div>
        </div>
      )}

      {isRepeatFormOpen && (
        <div
          onClick={() => setIsRepeatFormOpen(false)}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "calc(100% - 40px)",
              maxWidth: "380px",
              maxHeight: "calc(100vh - 36px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "18px",
              padding: "16px",
              border: "1px solid #e9ecef",
              boxShadow: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ fontSize: "20px" }}>반복 등록</h3>

              <button
                onClick={() => setIsRepeatFormOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <select
                value={repeatEmployee}
                onChange={(e) => setRepeatEmployee(e.target.value)}
                style={compactControlStyle}
              >
                <option value="">직원 선택</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.name}>
                    {employee.name}
                  </option>
                ))}
              </select>

              <select
                value={repeatApplyMode}
                onChange={(e) => setRepeatApplyMode(e.target.value)}
                style={compactControlStyle}
              >
                <option value="overwrite">덮어쓰기</option>
                <option value="empty">빈 날짜만</option>
              </select>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: "8px",
                }}
              >
                <input
                  type="date"
                  value={repeatStartDate}
                  onChange={(e) => setRepeatStartDate(e.target.value)}
                  style={compactDateControlStyle}
                />
                <input
                  type="date"
                  value={repeatEndDate}
                  onChange={(e) => setRepeatEndDate(e.target.value)}
                  style={compactDateControlStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: "8px",
                }}
              >
                <button
                  onClick={() => setRepeatMode("direct")}
                  style={getSegmentButtonStyle(repeatMode === "direct")}
                >
                  요일 직접
                </button>
                <button
                  onClick={() => setRepeatMode("pattern")}
                  style={getSegmentButtonStyle(repeatMode === "pattern")}
                >
                  패턴 사용
                </button>
              </div>
            </div>

            {repeatMode === "direct" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginBottom: "12px",
                }}
              >
                {weekdayLabels.map((label, index) => (
                  <RepeatSelectRow
                    key={label}
                    label={`${label}요일`}
                    value={repeatShiftTypes[index]}
                    onChange={(value) => {
                      const nextShiftTypes = [...repeatShiftTypes];
                      nextShiftTypes[index] = value;
                      setRepeatShiftTypes(nextShiftTypes);
                    }}
                    shiftTypes={shiftTypes}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginBottom: "12px",
                }}
              >
                {patternTemplates.length > 0 &&
                  repeatWeeks.map((week, index) => (
                    <div
                      key={`${week.startDate}-${week.endDate}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "92px 1fr",
                        alignItems: "center",
                        gap: "8px",
                        background: "#f8f9fb",
                        borderRadius: "10px",
                        padding: "8px",
                      }}
                    >
                      <div
                        style={{
                          color: "#495057",
                          fontSize: "12px",
                          fontWeight: "900",
                          lineHeight: "1.25",
                        }}
                      >
                        {index + 1}주차
                        <span
                          style={{
                            color: "#868e96",
                            display: "block",
                            fontSize: "10px",
                            fontWeight: "700",
                            marginTop: "1px",
                          }}
                        >
                          {formatMonthDay(week.startDate)}-
                          {formatMonthDay(week.endDate)}
                        </span>
                      </div>

                      <select
                        value={repeatWeekPatternIds[index] || ""}
                        onChange={(e) => {
                          const nextPatternIds = [...repeatWeekPatternIds];
                          nextPatternIds[index] = e.target.value;
                          setRepeatWeekPatternIds(nextPatternIds);
                        }}
                        style={compactControlStyle}
                      >
                        <option value="">등록 안 함</option>
                        {patternTemplates.map((pattern) => (
                          <option key={pattern.id} value={pattern.id}>
                            {pattern.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                {patternTemplates.length === 0 && (
                  <div
                    style={{
                      background: "#f8f9fb",
                      border: "1px solid #e9ecef",
                      borderRadius: "10px",
                      padding: "12px",
                    }}
                  >
                    <div
                      style={{
                        color: "#191f28",
                        fontSize: "13px",
                        fontWeight: "900",
                        marginBottom: "4px",
                      }}
                    >
                      등록된 패턴 템플릿이 없습니다.
                    </div>
                    <div
                      style={{
                        color: "#868e96",
                        fontSize: "12px",
                        fontWeight: "700",
                        lineHeight: "1.35",
                        marginBottom: "10px",
                      }}
                    >
                      자주 쓰는 주간 근무표를 저장해두면 반복 등록에서 바로
                      선택할 수 있습니다.
                    </div>
                    <button
                      type="button"
                      onClick={handleGoToPatternTemplate}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "#3182f6",
                        color: "#fff",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "900",
                        padding: "9px",
                      }}
                    >
                      패턴 템플릿 만들기
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSaveRepeatSchedules}
              style={{
                width: "100%",
                border: "none",
                background: "#3182f6",
                color: "#fff",
                borderRadius: "12px",
                padding: "14px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              저장
            </button>
          </div>
        </div>
      )}

      {isCopyFormOpen && (
        <div
          onClick={() => setIsCopyFormOpen(false)}
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "calc(100% - 40px)",
              maxWidth: "380px",
              maxHeight: "calc(100vh - 60px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid #e9ecef",
              boxShadow: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <h3>근무표 복사</h3>

              <button
                onClick={() => setIsCopyFormOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                복사 방식
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCopyUnitChange("month")}
                  style={getSegmentButtonStyle(copyUnit === "month")}
                >
                  월
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyUnitChange("week")}
                  style={getSegmentButtonStyle(copyUnit === "week")}
                >
                  주
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyUnitChange("direct")}
                  style={getSegmentButtonStyle(copyUnit === "direct")}
                >
                  직접
                </button>
              </div>

              {copyUnit === "month" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: "6px",
                  }}
                >
                  <label style={compactLabelStyle}>
                    복사할 달
                    <input
                      type="month"
                      value={copySourceMonth}
                      onChange={(e) =>
                        applyCopyMonthRange("source", e.target.value)
                      }
                      style={compactLabeledControlStyle}
                    />
                  </label>

                  <label style={compactLabelStyle}>
                    붙여넣을 달
                    <input
                      type="month"
                      value={copyTargetMonth}
                      onChange={(e) =>
                        applyCopyMonthRange("target", e.target.value)
                      }
                      style={compactLabeledControlStyle}
                    />
                  </label>
                </div>
              )}

              {copyUnit === "week" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: "6px",
                  }}
                >
                  <label style={compactLabelStyle}>
                    복사할 주
                    <input
                      type="date"
                      value={copySourceWeekDate}
                      onChange={(e) =>
                        applyCopyWeekRange("source", e.target.value)
                      }
                      style={compactLabeledControlStyle}
                    />
                  </label>

                  <label style={compactLabelStyle}>
                    붙여넣을 주
                    <input
                      type="date"
                      value={copyTargetWeekDate}
                      onChange={(e) =>
                        applyCopyWeekRange("target", e.target.value)
                      }
                      style={compactLabeledControlStyle}
                    />
                  </label>
                </div>
              )}

              {copyUnit === "direct" && (
                <div>
                  <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                    복사할 기간
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                      gap: "6px",
                      marginBottom: "12px",
                    }}
                  >
                    <input
                      type="date"
                      value={copySourceStartDate}
                      onChange={(e) => setCopySourceStartDate(e.target.value)}
                      style={compactDateControlStyle}
                    />
                    <input
                      type="date"
                      value={copySourceEndDate}
                      onChange={(e) => setCopySourceEndDate(e.target.value)}
                      style={compactDateControlStyle}
                    />
                  </div>

                  <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                    붙여넣을 기간
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="date"
                      value={copyTargetStartDate}
                      onChange={(e) => setCopyTargetStartDate(e.target.value)}
                      style={compactDateControlStyle}
                    />
                    <input
                      type="date"
                      value={copyTargetEndDate}
                      onChange={(e) => setCopyTargetEndDate(e.target.value)}
                      style={compactDateControlStyle}
                    />
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "#f8f9fb",
                  borderRadius: "10px",
                  color: "#495057",
                  fontSize: "12px",
                  marginTop: "10px",
                  padding: "10px",
                  lineHeight: "1.45",
                }}
              >
                {formatDateRange(copySourceStartDate, copySourceEndDate)} →{" "}
                {formatDateRange(copyTargetStartDate, copyTargetEndDate)}
                <br />
                같은 주차의 같은 요일로 복사됩니다. 날짜 조정이 필요하면 직접
                모드를 선택하세요.
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                대상 직원
              </div>

              <select
                value={copyEmployee}
                onChange={(e) => setCopyEmployee(e.target.value)}
                style={compactControlStyle}
              >
                <option value="ALL">전체 직원</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.name}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                적용 방식
              </div>

              <select
                value={copyApplyMode}
                onChange={(e) => setCopyApplyMode(e.target.value)}
                style={compactControlStyle}
              >
                <option value="overwrite">기존 스케줄 덮어쓰기</option>
                <option value="empty">빈 날짜에만 등록</option>
              </select>
            </div>

            <button
              onClick={handleSaveCopiedSchedules}
              style={{
                width: "100%",
                border: "none",
                background: "#3182f6",
                color: "#fff",
                borderRadius: "12px",
                padding: "14px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getDateRange(startDate, endDate) {
  const dates = [];
  let currentDate = dayjs(startDate);
  const lastDate = dayjs(endDate);

  while (
    currentDate.isBefore(lastDate, "day") ||
    currentDate.isSame(lastDate, "day")
  ) {
    dates.push(currentDate.format("YYYY-MM-DD"));
    currentDate = currentDate.add(1, "day");
  }

  return dates;
}

function getWeekChunks(startDate, endDate) {
  if (!startDate || !endDate || endDate < startDate) return [];

  const dates = getDateRange(startDate, endDate);
  const chunks = [];

  for (let index = 0; index < dates.length; index += 7) {
    chunks.push({
      startDate: dates[index],
      endDate: dates[Math.min(index + 6, dates.length - 1)],
    });
  }

  return chunks;
}

function getWeekIndexInRange(date, rangeStartDate) {
  return Math.floor(dayjs(date).diff(dayjs(rangeStartDate), "day") / 7);
}

function getWeekStart(date) {
  const selectedDate = dayjs(date);
  const daysFromMonday = (selectedDate.day() + 6) % 7;

  return selectedDate.subtract(daysFromMonday, "day");
}

function getMatchingWeekdayDate(
  sourceDate,
  sourceStartDate,
  targetStartDate,
  targetEndDate,
) {
  const source = dayjs(sourceDate);
  const sourceStart = dayjs(sourceStartDate);
  const targetStart = dayjs(targetStartDate);
  const targetEnd = dayjs(targetEndDate);
  const weekday = source.day();
  const weekOrder = getWeekdayOrderInRange(source, sourceStart);
  const firstTargetWeekday = getFirstWeekdayOnOrAfter(targetStart, weekday);
  const targetDate = firstTargetWeekday.add(weekOrder - 1, "week");

  if (targetDate.isAfter(targetEnd, "day")) return null;

  return targetDate.format("YYYY-MM-DD");
}

function getWeekdayOrderInRange(date, rangeStartDate) {
  const rangeStart = dayjs(rangeStartDate);
  const firstSameWeekday = getFirstWeekdayOnOrAfter(rangeStart, date.day());

  return date.diff(firstSameWeekday, "week") + 1;
}

function getFirstWeekdayOnOrAfter(date, weekday) {
  const daysUntilWeekday = (weekday - date.day() + 7) % 7;

  return date.add(daysUntilWeekday, "day");
}

function formatShortTimeRange(startTime, endTime) {
  return `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;
}

function formatMonthDay(date) {
  return dayjs(date).format("M/D");
}

function formatDateRange(startDate, endDate) {
  return `${startDate} ~ ${endDate}`;
}

function filterSchedulesByEmployeeId(schedules, employeeId) {
  return Object.entries(schedules).reduce((acc, [date, dailySchedules]) => {
    const filteredSchedules = dailySchedules.filter(
      (schedule) => String(schedule.employeeId) === String(employeeId),
    );

    if (filteredSchedules.length > 0) {
      acc[date] = filteredSchedules;
    }

    return acc;
  }, {});
}

function getSegmentButtonStyle(isActive) {
  return {
    border: "none",
    background: isActive ? "#3182f6" : "#f1f3f5",
    color: isActive ? "#fff" : "#495057",
    borderRadius: "10px",
    minWidth: 0,
    padding: "8px 6px",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
    lineHeight: "1.2",
    whiteSpace: "nowrap",
  };
}

const compactControlStyle = {
  width: "100%",
  minWidth: 0,
  minHeight: "36px",
  background: "#fff",
  color: "#191f28",
  padding: "8px 8px",
  paddingRight: "26px",
  borderRadius: "9px",
  border: "1px solid #dfe3e8",
  fontSize: "12px",
  fontWeight: "800",
  lineHeight: "1.2",
  opacity: 1,
};

const compactDateControlStyle = {
  ...compactControlStyle,
  padding: "8px 5px",
  paddingRight: "5px",
  fontSize: "11px",
  letterSpacing: 0,
};

const compactLabelStyle = {
  color: "#495057",
  display: "block",
  fontSize: "12px",
  fontWeight: "800",
  minWidth: 0,
};

const compactLabeledControlStyle = {
  ...compactDateControlStyle,
  marginTop: "5px",
};

function RepeatSelectRow({ label, value, onChange, shiftTypes }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "62px 1fr",
        alignItems: "center",
        gap: "6px",
        background: "#f8f9fb",
        borderRadius: "10px",
        padding: "7px 8px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: "900",
          color: "#495057",
        }}
      >
        {label}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={compactControlStyle}
      >
        <option value="">등록 안 함</option>
        {shiftTypes.map((shiftType) => (
          <option key={shiftType.name} value={shiftType.name}>
            {shiftType.icon} {shiftType.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CalendarPage;
