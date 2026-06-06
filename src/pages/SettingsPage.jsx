import { Link } from "react-router-dom";
import { useState } from "react";
import { FiHelpCircle, FiInfo, FiMenu, FiTrash2 } from "react-icons/fi";
import {
  deletePatternTemplate,
  deleteShiftType as removeShiftType,
  savePatternTemplate,
  saveShiftType,
  updateShiftTypeOrder,
} from "../services/workspaceService";

const categoryLabels = {
  WORK: "근무",
  OFF: "휴무",
  VACATION: "연차/휴가",
  OTHER: "기타 비근무",
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const emojiPresets = [
  "🔓",
  "🔒",
  "🕘",
  "🕛",
  "⏰",
  "☀️",
  "🌤️",
  "🌙",
  "🌃",
  "🏠",
  "🏖️",
  "🛌",
  "💊",
  "💼",
  "🍽️",
  "🧹",
  "🧾",
  "📦",
  "🛎️",
  "🛠️",
  "📚",
  "📌",
  "⭐",
  "✅",
];

const shouldOpenPatternForm = () =>
  new URLSearchParams(window.location.search).get("openPattern") === "true";

function SettingsPage({
  shiftTypes,
  setShiftTypes,
  schedules = {},
  setSchedules,
  patternTemplates = [],
  setPatternTemplates,
  workspace,
  memberRole,
  pendingMembers = [],
  onApproveMember,
  onRejectMember,
  onDataChanged,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPatternOpen, setIsPatternOpen] = useState(shouldOpenPatternForm);
  const [editingName, setEditingName] = useState(null);
  const [editingPatternId, setEditingPatternId] = useState(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("☀️");
  const [newCategory, setNewCategory] = useState("WORK");
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("18:00");
  const [patternName, setPatternName] = useState("");
  const [patternDays, setPatternDays] = useState(Array(7).fill(""));
  const [draggedShiftName, setDraggedShiftName] = useState(null);
  const [processingMemberId, setProcessingMemberId] = useState(null);
  const [isPatternHelpOpen, setIsPatternHelpOpen] =
    useState(shouldOpenPatternForm);

  const resetForm = () => {
    setEditingName(null);
    setNewName("");
    setNewIcon("☀️");
    setNewCategory("WORK");
    setNewStartTime("09:00");
    setNewEndTime("18:00");
  };

  const openAddForm = () => {
    resetForm();
    setIsOpen(true);
  };

  const openEditForm = (shiftType) => {
    setEditingName(shiftType.name);
    setNewName(shiftType.name);
    setNewIcon(shiftType.icon);
    setNewCategory(shiftType.category || "WORK");
    setNewStartTime(shiftType.startTime || "");
    setNewEndTime(shiftType.endTime || "");
    setIsOpen(true);
  };

  const closeForm = () => {
    resetForm();
    setIsOpen(false);
  };

  const resetPatternForm = () => {
    setEditingPatternId(null);
    setPatternName("");
    setPatternDays(Array(7).fill(""));
  };

  const openAddPatternForm = () => {
    resetPatternForm();
    setIsPatternOpen(true);
  };

  const openEditPatternForm = (pattern) => {
    setEditingPatternId(pattern.id);
    setPatternName(pattern.name);
    setPatternDays(pattern.days || Array(7).fill(""));
    setIsPatternOpen(true);
  };

  const closePatternForm = () => {
    resetPatternForm();
    setIsPatternOpen(false);
  };

  const handleSaveShiftType = async () => {
    const trimmedName = newName.trim();

    if (!newName.trim()) {
      alert("근무유형 이름을 입력해주세요.");
      return;
    }

    const isDuplicate = shiftTypes.some(
      (shiftType) =>
        shiftType.name === trimmedName && shiftType.name !== editingName,
    );

    if (isDuplicate) {
      alert("이미 등록된 근무유형입니다.");
      return;
    }

    if (newCategory === "WORK" && (!newStartTime || !newEndTime)) {
      alert("근무로 집계되는 유형은 시작시간과 종료시간을 입력해주세요.");
      return;
    }

    const nextShiftType = {
      id: shiftTypes.find((shiftType) => shiftType.name === editingName)?.id,
      name: trimmedName,
      icon: newIcon,
      color:
        shiftTypes.find((shiftType) => shiftType.name === editingName)?.color ||
        "#3182f6",
      startTime: newCategory === "WORK" ? newStartTime : "",
      endTime: newCategory === "WORK" ? newEndTime : "",
      category: newCategory,
    };

    try {
      if (workspace?.id) {
        const sortOrder = editingName
          ? shiftTypes.findIndex((shiftType) => shiftType.name === editingName)
          : shiftTypes.length;

        await saveShiftType(workspace.id, nextShiftType, sortOrder);
        closeForm();
        onDataChanged?.();
        return;
      }

      if (editingName) {
        setShiftTypes((prev) =>
          prev.map((shiftType) =>
            shiftType.name === editingName ? nextShiftType : shiftType,
          ),
        );

        setSchedules((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([date, dailySchedules]) => [
              date,
              dailySchedules.map((schedule) =>
                schedule.type === editingName
                  ? {
                      ...schedule,
                      type: trimmedName,
                      icon: newIcon,
                      color: nextShiftType.color,
                      category: newCategory,
                      startTime: nextShiftType.startTime,
                      endTime: nextShiftType.endTime,
                    }
                  : schedule,
              ),
            ]),
          ),
        );

        setPatternTemplates((prev) =>
          prev.map((pattern) => ({
            ...pattern,
            days: pattern.days.map((day) =>
              day === editingName ? trimmedName : day,
            ),
          })),
        );
      } else {
        setShiftTypes((prev) => [
          ...prev,
          {
            ...nextShiftType,
            color: "#3182f6",
          },
        ]);
      }

      closeForm();
    } catch (error) {
      alert(error.message || "근무유형을 저장하지 못했습니다.");
    }
  };

  const handleDeleteShiftType = async (shiftTypeName) => {
    const shiftType = shiftTypes.find((item) => item.name === shiftTypeName);
    const isUsed = Object.values(schedules).some((dailySchedules) =>
      dailySchedules.some((schedule) => schedule.type === shiftTypeName),
    );
    const isUsedInPattern = patternTemplates.some((pattern) =>
      pattern.days.includes(shiftTypeName),
    );

    if (isUsed) {
      alert("이 근무유형은 등록된 스케줄에서 사용 중이라 삭제할 수 없습니다.");
      return;
    }

    if (isUsedInPattern) {
      alert("이 근무유형은 패턴 템플릿에서 사용 중이라 삭제할 수 없습니다.");
      return;
    }

    const confirmed = window.confirm("이 근무유형을 삭제할까요?");

    if (!confirmed) return;

    try {
      if (workspace?.id && shiftType?.id) {
        await removeShiftType(shiftType.id);
        onDataChanged?.();
        return;
      }

      setShiftTypes((prev) =>
        prev.filter((shiftType) => shiftType.name !== shiftTypeName),
      );
    } catch (error) {
      alert(error.message || "근무유형을 삭제하지 못했습니다.");
    }
  };

  const handleSavePattern = async () => {
    const trimmedName = patternName.trim();

    if (!trimmedName) {
      alert("패턴 이름을 입력해주세요.");
      return;
    }

    if (!patternDays.some(Boolean)) {
      alert("요일별 근무유형을 하나 이상 선택해주세요.");
      return;
    }

    const isDuplicate = patternTemplates.some(
      (pattern) =>
        pattern.name === trimmedName && pattern.id !== editingPatternId,
    );

    if (isDuplicate) {
      alert("이미 등록된 패턴 이름입니다.");
      return;
    }

    const nextPattern = {
      id: editingPatternId || Date.now(),
      name: trimmedName,
      days: patternDays,
    };

    try {
      if (workspace?.id) {
        await savePatternTemplate(workspace.id, nextPattern, shiftTypes);
        closePatternForm();
        onDataChanged?.();
        return;
      }

      if (editingPatternId) {
        setPatternTemplates((prev) =>
          prev.map((pattern) =>
            pattern.id === editingPatternId ? nextPattern : pattern,
          ),
        );
      } else {
        setPatternTemplates((prev) => [...prev, nextPattern]);
      }

      closePatternForm();
    } catch (error) {
      alert(error.message || "패턴 템플릿을 저장하지 못했습니다.");
    }
  };

  const handleDeletePattern = async (patternId) => {
    const confirmed = window.confirm("이 패턴 템플릿을 삭제할까요?");

    if (!confirmed) return;

    try {
      if (workspace?.id) {
        await deletePatternTemplate(patternId);
        onDataChanged?.();
        return;
      }

      setPatternTemplates((prev) =>
        prev.filter((pattern) => pattern.id !== patternId),
      );
    } catch (error) {
      alert(error.message || "패턴 템플릿을 삭제하지 못했습니다.");
    }
  };

  const handleDropShiftType = (targetName) => {
    if (!draggedShiftName || draggedShiftName === targetName) return;

    setShiftTypes((prev) => {
      const fromIndex = prev.findIndex(
        (shiftType) => shiftType.name === draggedShiftName,
      );
      const toIndex = prev.findIndex((shiftType) => shiftType.name === targetName);

      if (fromIndex === -1 || toIndex === -1) return prev;

      const nextShiftTypes = moveItem(prev, fromIndex, toIndex);

      if (workspace?.id) {
        updateShiftTypeOrder(nextShiftTypes)
          .then(() => onDataChanged?.())
          .catch((error) => {
            alert(error.message || "근무유형 순서를 저장하지 못했습니다.");
            onDataChanged?.();
          });
      }

      return nextShiftTypes;
    });
  };

  const getShiftTypeMeta = (name) =>
    shiftTypes.find((shiftType) => shiftType.name === name);
  const handleCopyInviteCode = async () => {
    if (!workspace?.invite_code) return;

    try {
      await navigator.clipboard.writeText(workspace.invite_code);
      alert("초대 코드를 복사했습니다.");
    } catch {
      alert(`초대 코드: ${workspace.invite_code}`);
    }
  };
  const handleApproveMember = async (userId) => {
    if (!onApproveMember) return;

    setProcessingMemberId(userId);

    try {
      await onApproveMember(userId);
    } catch (error) {
      alert(error.message || "참여 요청을 승인하지 못했습니다.");
    } finally {
      setProcessingMemberId(null);
    }
  };
  const handleRejectMember = async (userId) => {
    if (!onRejectMember) return;

    const confirmed = window.confirm("이 참여 요청을 거절할까요?");

    if (!confirmed) return;

    setProcessingMemberId(userId);

    try {
      await onRejectMember(userId);
    } catch (error) {
      alert(error.message || "참여 요청을 거절하지 못했습니다.");
    } finally {
      setProcessingMemberId(null);
    }
  };

  const currentEditMeta = getShiftTypeMeta(editingName);
  const modalTitle = editingName ? "근무유형 수정" : "근무유형 추가";

  return (
    <div>
      <Link
        to="/help"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
          padding: "14px 16px",
          background: "#f8f9fb",
          border: "1px solid #e9ecef",
          borderRadius: "16px",
          color: "#191f28",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "999px",
            background: "#edf4ff",
            color: "#3182f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FiInfo size={18} />
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: "800" }}>
            사용 가이드
          </div>
          <div
            style={{
              color: "#868e96",
              fontSize: "12px",
              fontWeight: "700",
              marginTop: "4px",
              lineHeight: "1.35",
            }}
          >
            근무 등록, 반복 등록, 복사, 통계 계산 기준을 확인할 수 있습니다.
          </div>
        </div>
      </Link>

      {workspace?.invite_code && (
        <div
          style={{
            background: "#edf4ff",
            border: "1px solid #dbeafe",
            borderRadius: "16px",
            marginBottom: "12px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#3182f6",
                  fontSize: "12px",
                  fontWeight: "900",
                  marginBottom: "5px",
                }}
              >
                직원 초대 코드
              </div>
              <div
                style={{
                  color: "#191f28",
                  fontSize: "22px",
                  fontWeight: "900",
                  letterSpacing: "1px",
                }}
              >
                {workspace.invite_code}
              </div>
              <div
                style={{
                  color: "#5c677d",
                  fontSize: "12px",
                  fontWeight: "700",
                  marginTop: "5px",
                }}
              >
                {memberRole === "ADMIN"
                  ? "직원이 가입 후 이 코드를 입력하면 참여할 수 있습니다."
                  : "참여 중인 근무표의 코드입니다."}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyInviteCode}
              style={{
                border: "none",
                background: "#3182f6",
                color: "#fff",
                borderRadius: "10px",
                cursor: "pointer",
                flexShrink: 0,
                fontSize: "13px",
                fontWeight: "900",
                padding: "9px 12px",
              }}
            >
              복사
            </button>
          </div>
        </div>
      )}

      {memberRole === "ADMIN" && pendingMembers.length > 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e9ecef",
            borderRadius: "16px",
            marginBottom: "12px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <h2 style={{ fontSize: "18px" }}>참여 요청</h2>
            <div
              style={{
                background: "#fff4e6",
                borderRadius: "999px",
                color: "#f08c00",
                fontSize: "12px",
                fontWeight: "900",
                padding: "5px 9px",
              }}
            >
              {pendingMembers.length}명 대기
            </div>
          </div>

          {pendingMembers.map((member) => (
            <div
              key={member.userId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                background: "#f8f9fb",
                borderRadius: "12px",
                padding: "12px",
                marginBottom: "8px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#191f28",
                    fontSize: "14px",
                    fontWeight: "900",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {member.email}
                </div>
                <div
                  style={{
                    color: "#868e96",
                    fontSize: "12px",
                    fontWeight: "700",
                    marginTop: "4px",
                  }}
                >
                  승인 전까지 스케줄을 볼 수 없습니다.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  disabled={processingMemberId === member.userId}
                  onClick={() => handleRejectMember(member.userId)}
                  style={{
                    border: "none",
                    background: "#fff5f5",
                    color: "#fa5252",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "900",
                    padding: "8px 10px",
                  }}
                >
                  거절
                </button>
                <button
                  type="button"
                  disabled={processingMemberId === member.userId}
                  onClick={() => handleApproveMember(member.userId)}
                  style={{
                    border: "none",
                    background: "#3182f6",
                    color: "#fff",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "900",
                    padding: "8px 10px",
                  }}
                >
                  승인
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
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
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "18px" }}>근무유형 관리</h2>

          <button
            onClick={openAddForm}
            style={{
              border: "none",
              background: "#3182f6",
              color: "#fff",
              borderRadius: "10px",
              padding: "8px 12px",
              fontWeight: "800",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + 추가
          </button>
        </div>

        {shiftTypes.map((shiftType) => (
          <div
            key={shiftType.name}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", shiftType.name);
              setDraggedShiftName(shiftType.name);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={() => handleDropShiftType(shiftType.name)}
            onDragEnd={() => setDraggedShiftName(null)}
            onClick={() => openEditForm(shiftType)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8f9fb",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "8px",
              cursor: "grab",
              opacity: draggedShiftName === shiftType.name ? 0.45 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <FiMenu
                aria-label="순서 변경"
                size={18}
                color="#adb5bd"
                style={{ flexShrink: 0 }}
              />

              <div>
                <div style={{ fontWeight: "bold" }}>{shiftType.name}</div>
                <div style={{ color: "#868e96", fontSize: "12px" }}>
                  {categoryLabels[shiftType.category || "WORK"]}
                  {shiftType.category === "WORK" &&
                    shiftType.startTime &&
                    shiftType.endTime &&
                    ` · ${shiftType.startTime}~${shiftType.endTime}`}
                </div>
              </div>
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
                  fontSize: "20px",
                }}
              >
                {shiftType.icon}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteShiftType(shiftType.name);
                }}
                aria-label={`${shiftType.name} 삭제`}
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
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e9ecef",
          borderRadius: "16px",
          padding: "16px",
          marginTop: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: 0,
            }}
          >
            <h2 style={{ fontSize: "18px" }}>패턴 템플릿 관리</h2>
            <button
              type="button"
              onClick={() => setIsPatternHelpOpen((prev) => !prev)}
              aria-label="패턴 템플릿 설명"
              style={{
                border: "none",
                background: "#f1f3f5",
                color: "#868e96",
                borderRadius: "999px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                width: "28px",
                height: "28px",
              }}
            >
              <FiHelpCircle size={16} />
            </button>
          </div>

          <button
            onClick={openAddPatternForm}
            style={{
              border: "none",
              background: "#3182f6",
              color: "#fff",
              borderRadius: "10px",
              padding: "8px 12px",
              fontWeight: "800",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + 추가
          </button>
        </div>

        {isPatternHelpOpen && (
          <div
            style={{
              background: "#f8f9fb",
              border: "1px solid #e9ecef",
              borderRadius: "12px",
              color: "#495057",
              fontSize: "13px",
              fontWeight: "700",
              lineHeight: "1.5",
              marginBottom: "12px",
              padding: "12px",
            }}
          >
            자주 쓰는 주간 근무표를 저장해두는 기능입니다. 반복 등록할 때
            선택하면 요일별 근무가 자동으로 채워집니다.
          </div>
        )}

        {patternTemplates.length === 0 ? (
          <div
            style={{
              color: "#868e96",
              background: "#f8f9fb",
              borderRadius: "12px",
              padding: "16px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            등록된 패턴이 없습니다.
          </div>
        ) : (
          patternTemplates.map((pattern) => (
            <div
              key={pattern.id}
              onClick={() => openEditPatternForm(pattern)}
              style={{
                background: "#f8f9fb",
                borderRadius: "12px",
                padding: "12px",
                marginBottom: "8px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: "800", marginBottom: "6px" }}>
                    {pattern.name}
                  </div>
                  <div
                    style={{
                      color: "#868e96",
                      fontSize: "12px",
                      lineHeight: "1.4",
                    }}
                  >
                    {formatPatternSummary(pattern.days)}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePattern(pattern.id);
                  }}
                  aria-label={`${pattern.name} 삭제`}
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
                    flexShrink: 0,
                  }}
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isOpen && (
        <div
          onClick={closeForm}
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
              <h3>{modalTitle}</h3>

              <button
                onClick={closeForm}
                aria-label="닫기"
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
              <div style={{ marginBottom: "8px", fontSize: "14px" }}>이름</div>

              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 오픈, 미들, 마감"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                이모지
              </div>

              <input
                className="emoji-input"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="원하는 이모지를 입력하거나 아래에서 선택"
                maxLength={8}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  fontSize: "18px",
                }}
              />

              <div
                style={{
                  color: "#868e96",
                  fontSize: "12px",
                  marginTop: "6px",
                }}
              >
                원하는 이모지를 직접 입력해도 됩니다.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 1fr)",
                  gap: "6px",
                  marginTop: "10px",
                }}
              >
                {emojiPresets.map((emoji) => {
                  const isSelected = newIcon === emoji;

                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      style={{
                        height: "34px",
                        border: isSelected
                          ? "2px solid #3182f6"
                          : "1px solid #e9ecef",
                        background: isSelected ? "#edf4ff" : "#fff",
                        borderRadius: "10px",
                        fontSize: "18px",
                        cursor: "pointer",
                      }}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                통계 분류
              </div>

              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="WORK">근무로 집계</option>
                <option value="OFF">휴무로 집계</option>
                <option value="VACATION">연차/휴가로 집계</option>
                <option value="OTHER">기타 비근무로 집계</option>
              </select>
            </div>

            {newCategory === "WORK" && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "8px", fontSize: "14px" }}>
                  기본 근무시간
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid #ddd",
                    }}
                  />
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "1px solid #ddd",
                    }}
                  />
                </div>

                <div
                  style={{
                    color: "#868e96",
                    fontSize: "12px",
                    marginTop: "6px",
                  }}
                >
                  주간 근무 등록과 새 근무 등록에 기본값으로 사용됩니다.
                </div>
              </div>
            )}

            {editingName && currentEditMeta && (
              <div
                style={{
                  color: "#868e96",
                  fontSize: "12px",
                  lineHeight: "1.4",
                  marginBottom: "14px",
                }}
              >
                저장하면 기존 스케줄의 이름, 이모지, 통계 분류도 함께
                갱신됩니다.
              </div>
            )}

            <button
              onClick={handleSaveShiftType}
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

      {isPatternOpen && (
        <div
          onClick={closePatternForm}
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
              maxWidth: "380px",
              maxHeight: "calc(100vh - 60px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "20px",
              padding: "20px",
              border: "1px solid #e9ecef",
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
              <h3>{editingPatternId ? "패턴 수정" : "패턴 추가"}</h3>

              <button
                onClick={closePatternForm}
                aria-label="닫기"
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
                패턴 이름
              </div>

              <input
                value={patternName}
                onChange={(e) => setPatternName(e.target.value)}
                placeholder="예: A패턴, 야간 주"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              {weekdayLabels.map((label, index) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "76px 1fr",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f8f9fb",
                    borderRadius: "10px",
                    padding: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#495057",
                    }}
                  >
                    {label}요일
                  </div>

                  <select
                    value={patternDays[index]}
                    onChange={(e) => {
                      const nextDays = [...patternDays];
                      nextDays[index] = e.target.value;
                      setPatternDays(nextDays);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid #ddd",
                    }}
                  >
                    <option value="">등록 안 함</option>
                    {shiftTypes.map((shiftType) => (
                      <option key={shiftType.name} value={shiftType.name}>
                        {shiftType.icon} {shiftType.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              onClick={handleSavePattern}
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

function moveItem(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  nextItems.splice(toIndex, 0, movedItem);

  return nextItems;
}

function formatPatternSummary(days) {
  return days
    .map((shiftTypeName, index) =>
      shiftTypeName ? `${weekdayLabels[index]} ${shiftTypeName}` : null,
    )
    .filter(Boolean)
    .join(" / ");
}

export default SettingsPage;
