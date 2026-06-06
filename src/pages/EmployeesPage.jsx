import { useState } from "react";
import { FiMenu, FiRefreshCcw, FiTrash2 } from "react-icons/fi";
import {
  createEmployee,
  deactivateEmployee,
  deleteEmployeeWithSchedules,
  hideEmployee,
  restoreEmployee,
  updateEmployeeOrder,
} from "../services/workspaceService";

function EmployeesPage({
  workspace,
  employees,
  setEmployees,
  schedules = {},
  setSchedules,
  onDataChanged,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("USER");
  const [draggedEmployeeId, setDraggedEmployeeId] = useState(null);
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteMode, setDeleteMode] = useState("keep");
  const activeEmployees = sortEmployeesForDisplay(
    employees.filter(isActiveEmployee),
  );
  const inactiveEmployees = sortEmployeesForDisplay(
    employees.filter(
      (employee) => !isActiveEmployee(employee) && !employee.deletedAt,
    ),
  );

  const handleAddEmployee = async () => {
    if (!newName.trim()) {
      alert("직원명을 입력해주세요.");
      return;
    }

    const isDuplicate = employees.some(
      (employee) => !employee.deletedAt && employee.name === newName.trim(),
    );

    if (isDuplicate) {
      alert("이미 등록된 직원입니다. 이전 직원이라면 다시 사용을 눌러주세요.");
      return;
    }

    try {
      if (workspace?.id) {
        await createEmployee(
          workspace.id,
          {
            name: newName.trim(),
            role: newRole,
          },
          employees.length,
        );
        onDataChanged?.();
      } else {
        setEmployees((prev) => [
          ...prev,
          {
            id: Date.now(),
            name: newName.trim(),
            role: newRole,
            isActive: true,
          },
        ]);
      }

      setNewName("");
      setNewRole("USER");
      setIsOpen(false);
    } catch (error) {
      alert(error.message || "직원을 저장하지 못했습니다.");
    }
  };

  const handleDeactivateEmployee = async (id) => {
    const employee = employees.find((item) => item.id === id);

    if (!employee) return;

    const hasSchedules = hasEmployeeSchedules(schedules, employee);

    if (!hasSchedules) {
      const confirmed = window.confirm(
        `${employee.name} 직원은 등록된 스케줄이 없어 바로 삭제됩니다.`,
      );

      if (!confirmed) return;

      try {
        if (workspace?.id) {
          await deleteEmployeeWithSchedules(id);
          onDataChanged?.();
          return;
        }

        setEmployees((prev) => prev.filter((item) => item.id !== id));
      } catch (error) {
        alert(error.message || "직원을 삭제하지 못했습니다.");
      }

      return;
    }

    const confirmed = window.confirm(
      `${employee.name} 직원을 이전 직원으로 변경할까요?\n기존 스케줄과 통계 기록은 유지됩니다.`,
    );

    if (!confirmed) return;

    try {
      if (workspace?.id) {
        await deactivateEmployee(id);
        onDataChanged?.();
        return;
      }

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                isActive: false,
                inactiveAt: new Date().toISOString().slice(0, 10),
              }
            : item,
        ),
      );
    } catch (error) {
      alert(error.message || "이전 직원으로 변경하지 못했습니다.");
    }
  };

  const handleRestoreEmployee = async (id) => {
    const employee = employees.find((item) => item.id === id);

    if (!employee) return;

    try {
      if (workspace?.id) {
        await restoreEmployee(id);
        onDataChanged?.();
        return;
      }

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, isActive: true, inactiveAt: null, deletedAt: null }
            : item,
        ),
      );
    } catch (error) {
      alert(error.message || "직원을 다시 사용하지 못했습니다.");
    }
  };

  const handleConfirmDeleteInactiveEmployee = async () => {
    if (!deleteTarget) return;

    try {
      if (workspace?.id) {
        if (deleteMode === "keep") {
          await hideEmployee(deleteTarget.id);
        } else {
          await deleteEmployeeWithSchedules(deleteTarget.id);
        }

        onDataChanged?.();
      } else if (deleteMode === "keep") {
        setEmployees((prev) =>
          prev.map((employee) =>
            employee.id === deleteTarget.id
              ? { ...employee, deletedAt: new Date().toISOString() }
              : employee,
          ),
        );
      } else {
        setEmployees((prev) =>
          prev.filter((employee) => employee.id !== deleteTarget.id),
        );
        setSchedules((prev) =>
          Object.fromEntries(
            Object.entries(prev)
              .map(([date, dailySchedules]) => [
                date,
                dailySchedules.filter(
                  (schedule) => schedule.name !== deleteTarget.name,
                ),
              ])
              .filter(([, dailySchedules]) => dailySchedules.length > 0),
          ),
        );
      }

      setDeleteTarget(null);
      setDeleteMode("keep");
    } catch (error) {
      alert(error.message || "이전 직원을 삭제하지 못했습니다.");
    }
  };

  const handleDropEmployee = (targetId) => {
    if (!draggedEmployeeId || draggedEmployeeId === targetId) return;

    setEmployees((prev) => {
      const activeItems = sortEmployeesForDisplay(prev.filter(isActiveEmployee));
      const inactiveItems = prev.filter((employee) => !isActiveEmployee(employee));
      const fromIndex = activeItems.findIndex(
        (employee) => employee.id === draggedEmployeeId,
      );
      const toIndex = activeItems.findIndex((employee) => employee.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return prev;

      const nextEmployees = [
        ...moveItem(activeItems, fromIndex, toIndex),
        ...inactiveItems,
      ];

      if (workspace?.id) {
        updateEmployeeOrder(nextEmployees)
          .then(() => onDataChanged?.())
          .catch((error) => {
            alert(error.message || "직원 순서를 저장하지 못했습니다.");
            onDataChanged?.();
          });
      }

      return nextEmployees;
    });
  };

  return (
    <div>
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
          <h2 style={{ fontSize: "18px" }}>직원 관리</h2>

          <button
            onClick={() => setIsOpen(true)}
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

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeEmployees.length === 0 ? (
            <EmptyState text="등록된 현재 직원이 없습니다." />
          ) : (
            activeEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                draggedEmployeeId={draggedEmployeeId}
                onDragStart={setDraggedEmployeeId}
                onDrop={handleDropEmployee}
                onDragEnd={() => setDraggedEmployeeId(null)}
                action={
                  <button
                    onClick={() => handleDeactivateEmployee(employee.id)}
                    aria-label={`${employee.name} 이전 직원으로 변경`}
                    style={iconButtonStyle(dangerIconButtonStyle)}
                  >
                    <FiTrash2 size={16} />
                  </button>
                }
              />
            ))
          )}
        </div>

        <div
          style={{
            borderTop: "1px solid #edf0f2",
            marginTop: "14px",
            paddingTop: "12px",
          }}
        >
          <button
            onClick={() => setShowInactiveEmployees((prev) => !prev)}
            style={{
              width: "100%",
              border: "none",
              background: "#f1f3f5",
              color: "#495057",
              borderRadius: "10px",
              padding: "11px",
              fontSize: "13px",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            이전 직원 {inactiveEmployees.length}명{" "}
            {showInactiveEmployees ? "접기" : "보기"}
          </button>

          {showInactiveEmployees && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              {inactiveEmployees.length === 0 ? (
                <EmptyState text="이전 직원이 없습니다." />
              ) : (
                inactiveEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    isInactive
                    action={
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleRestoreEmployee(employee.id)}
                          aria-label={`${employee.name} 다시 사용`}
                          style={iconButtonStyle(restoreIconButtonStyle)}
                        >
                          <FiRefreshCcw size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(employee);
                            setDeleteMode("keep");
                          }}
                          aria-label={`${employee.name} 삭제`}
                          style={iconButtonStyle(dangerIconButtonStyle)}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    }
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
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
              <h3>직원 추가</h3>

              <button
                onClick={() => setIsOpen(false)}
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
                직원명
              </div>

              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 김민수"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "8px", fontSize: "14px" }}>권한</div>

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="USER">사용자</option>
                <option value="ADMIN">관리자</option>
              </select>
            </div>

            <button
              onClick={handleAddEmployee}
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

      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(25, 31, 40, 0.18)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "calc(100% - 40px)",
              maxWidth: "360px",
              background: "#fff",
              borderRadius: "18px",
              padding: "18px",
              border: "1px solid #e9ecef",
            }}
          >
            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>
              이전 직원 삭제
            </h3>
            <p
              style={{
                color: "#495057",
                fontSize: "13px",
                fontWeight: "700",
                lineHeight: "1.45",
                marginBottom: "12px",
              }}
            >
              {deleteTarget.name} 직원의 과거 스케줄을 어떻게 처리할까요?
            </p>

            <DeleteModeOption
              checked={deleteMode === "keep"}
              onChange={() => setDeleteMode("keep")}
              title="기록 유지"
              description="직원 목록에서만 숨기고 과거 달력과 통계는 유지합니다."
            />
            <DeleteModeOption
              checked={deleteMode === "remove"}
              onChange={() => setDeleteMode("remove")}
              title="기록까지 삭제"
              description="등록된 스케줄과 통계 기록도 함께 삭제합니다."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={secondaryButtonStyle}
              >
                취소
              </button>
              <button
                onClick={handleConfirmDeleteInactiveEmployee}
                style={dangerButtonStyle}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeCard({
  employee,
  action,
  draggedEmployeeId,
  isInactive = false,
  onDragStart,
  onDrop,
  onDragEnd,
}) {
  const draggable = !isInactive;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(employee.id));
        onDragStart?.(employee.id);
      }}
      onDragOver={(e) => {
        if (!draggable) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={() => draggable && onDrop?.(employee.id)}
      onDragEnd={onDragEnd}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: isInactive ? "#fff" : "#f8f9fb",
        border: isInactive ? "1px solid #edf0f2" : "none",
        borderRadius: "12px",
        padding: "12px",
        cursor: draggable ? "grab" : "default",
        opacity: draggedEmployeeId === employee.id ? 0.45 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          minWidth: 0,
        }}
      >
        <FiMenu
          aria-label="순서 변경"
          size={18}
          color={isInactive ? "#dee2e6" : "#adb5bd"}
          style={{ flexShrink: 0 }}
        />

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: "bold" }}>{employee.name}</div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: "5px",
              marginTop: "4px",
            }}
          >
            <RoleBadge role={employee.role} />
            {isInactive && <StatusBadge />}
          </div>
          {isInactive && employee.inactiveAt && (
            <div
              style={{
                color: "#868e96",
                fontSize: "12px",
                fontWeight: "700",
                marginTop: "3px",
              }}
            >
              이전 처리일 {formatDate(employee.inactiveAt)}
            </div>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      style={{
        background: "#f8f9fb",
        borderRadius: "12px",
        color: "#868e96",
        fontSize: "13px",
        fontWeight: "800",
        padding: "16px",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function DeleteModeOption({ checked, onChange, title, description }) {
  return (
    <label
      style={{
        display: "block",
        border: checked ? "1px solid #3182f6" : "1px solid #e9ecef",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "8px",
        cursor: "pointer",
        background: checked ? "#edf4ff" : "#fff",
      }}
    >
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          style={{ marginTop: "3px" }}
        />
        <div>
          <div style={{ color: "#191f28", fontSize: "14px", fontWeight: "900" }}>
            {title}
          </div>
          <div
            style={{
              color: "#868e96",
              fontSize: "12px",
              fontWeight: "700",
              lineHeight: "1.4",
              marginTop: "3px",
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </label>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === "ADMIN";

  return (
    <span
      style={{
        background: isAdmin ? "#edf4ff" : "#f1f3f5",
        border: `1px solid ${isAdmin ? "#d0ebff" : "#e9ecef"}`,
        borderRadius: "999px",
        color: isAdmin ? "#1971c2" : "#868e96",
        fontSize: "11px",
        fontWeight: "900",
        lineHeight: "1",
        padding: "5px 7px",
      }}
    >
      {isAdmin ? "관리자" : "사용자"}
    </span>
  );
}

function StatusBadge() {
  return (
    <span
      style={{
        background: "#fff4e6",
        border: "1px solid #ffe8cc",
        borderRadius: "999px",
        color: "#d9480f",
        fontSize: "11px",
        fontWeight: "900",
        lineHeight: "1",
        padding: "5px 7px",
      }}
    >
      이전 직원
    </span>
  );
}

function moveItem(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  nextItems.splice(toIndex, 0, movedItem);

  return nextItems;
}

function isActiveEmployee(employee) {
  return employee.isActive !== false && !employee.deletedAt;
}

function sortEmployeesForDisplay(items) {
  return [...items].sort((a, b) => {
    const roleOrder = getRoleOrder(a.role) - getRoleOrder(b.role);

    if (roleOrder !== 0) return roleOrder;

    return 0;
  });
}

function getRoleOrder(role) {
  return role === "ADMIN" ? 0 : 1;
}

function hasEmployeeSchedules(schedules, employee) {
  return Object.values(schedules).some((dailySchedules) =>
    dailySchedules.some(
      (schedule) =>
        schedule.employeeId === employee.id || schedule.name === employee.name,
    ),
  );
}

function formatDate(date) {
  if (!date) return "";

  return String(date).slice(0, 10).replaceAll("-", ".");
}

function iconButtonStyle({ background, color }) {
  return {
    border: "none",
    background,
    color,
    borderRadius: "999px",
    width: "32px",
    height: "32px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

const dangerIconButtonStyle = {
  background: "#fff5f5",
  color: "#fa5252",
};

const restoreIconButtonStyle = {
  background: "#edf4ff",
  color: "#3182f6",
};

const secondaryButtonStyle = {
  border: "none",
  background: "#f1f3f5",
  color: "#495057",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const dangerButtonStyle = {
  border: "none",
  background: "#fa5252",
  color: "#fff",
  borderRadius: "12px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

export default EmployeesPage;
