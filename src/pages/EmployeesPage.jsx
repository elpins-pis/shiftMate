import { useState } from "react";
import { FiMenu, FiTrash2 } from "react-icons/fi";
import {
  createEmployee,
  deleteEmployee,
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

  const handleAddEmployee = async () => {
    if (!newName.trim()) {
      alert("직원명을 입력해주세요.");
      return;
    }

    const isDuplicate = employees.some(
      (employee) => employee.name === newName.trim(),
    );

    if (isDuplicate) {
      alert("이미 등록된 직원입니다.");
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

  const handleDeleteEmployee = async (id) => {
    const employee = employees.find((item) => item.id === id);

    if (!employee) return;

    const isUsed = Object.values(schedules).some((dailySchedules) =>
      dailySchedules.some((schedule) => schedule.name === employee.name),
    );
    const message = isUsed
      ? `${employee.name} 직원과 등록된 스케줄을 함께 삭제할까요?`
      : `${employee.name} 직원을 삭제할까요?`;
    const confirmed = window.confirm(message);

    if (!confirmed) return;

    try {
      if (workspace?.id) {
        await deleteEmployee(id);
        onDataChanged?.();
        return;
      }

      setEmployees((prev) => prev.filter((employee) => employee.id !== id));

      if (isUsed) {
        setSchedules((prev) =>
          Object.fromEntries(
            Object.entries(prev)
              .map(([date, dailySchedules]) => [
                date,
                dailySchedules.filter(
                  (schedule) => schedule.name !== employee.name,
                ),
              ])
              .filter(([, dailySchedules]) => dailySchedules.length > 0),
          ),
        );
      }
    } catch (error) {
      alert(error.message || "직원을 삭제하지 못했습니다.");
    }
  };

  const handleDropEmployee = (targetId) => {
    if (!draggedEmployeeId || draggedEmployeeId === targetId) return;

    setEmployees((prev) => {
      const fromIndex = prev.findIndex(
        (employee) => employee.id === draggedEmployeeId,
      );
      const toIndex = prev.findIndex((employee) => employee.id === targetId);

      if (fromIndex === -1 || toIndex === -1) return prev;

      const nextEmployees = moveItem(prev, fromIndex, toIndex);

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

        {employees.map((employee) => (
          <div
            key={employee.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(employee.id));
              setDraggedEmployeeId(employee.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={() => handleDropEmployee(employee.id)}
            onDragEnd={() => setDraggedEmployeeId(null)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8f9fb",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "8px",
              cursor: "grab",
              opacity: draggedEmployeeId === employee.id ? 0.45 : 1,
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
                <div style={{ fontWeight: "bold" }}>{employee.name}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  {employee.role === "ADMIN" ? "관리자" : "사용자"}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDeleteEmployee(employee.id)}
              aria-label={`${employee.name} 삭제`}
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
        ))}
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
    </div>
  );
}

function moveItem(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  nextItems.splice(toIndex, 0, movedItem);

  return nextItems;
}

export default EmployeesPage;
