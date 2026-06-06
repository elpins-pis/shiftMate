import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { FiCalendar, FiLock } from "react-icons/fi";

import { useAuth } from "../contexts/useAuth";
import {
  defaultEmployees,
  defaultPatternTemplates,
  defaultSchedules,
  defaultShiftTypes,
} from "../data/defaultData";
import MainLayout from "../layouts/MainLayout";
import CalendarPage from "../pages/CalendarPage";
import EmployeesPage from "../pages/EmployeesPage";
import HelpPage from "../pages/HelpPage";
import SettingsPage from "../pages/SettingsPage";
import StatsPage from "../pages/StatsPage";
import AuthPage from "../pages/AuthPage";
import PendingApprovalPage from "../pages/PendingApprovalPage";
import WorkspaceSetupPage from "../pages/WorkspaceSetupPage";
import {
  approveWorkspaceMember,
  loadWorkspaceAppData,
  rejectWorkspaceMember,
} from "../services/workspaceService";

function AppRouter() {
  const { user, loading: authLoading, isSupabaseConfigured } = useAuth();
  const userId = user?.id;
  const [shiftTypes, setShiftTypes] = useState(defaultShiftTypes);
  const [employees, setEmployees] = useState(defaultEmployees);
  const [schedules, setSchedules] = useState(defaultSchedules);
  const [patternTemplates, setPatternTemplates] = useState(
    defaultPatternTemplates,
  );
  const [workspace, setWorkspace] = useState(null);
  const [memberRole, setMemberRole] = useState(null);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [dataError, setDataError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      return undefined;
    }

    let isCancelled = false;

    async function loadData() {
      setDataLoading(true);
      setHasLoadedData(false);
      setDataError("");

      try {
        const appData = await loadWorkspaceAppData();

        if (isCancelled) return;

        setWorkspace(appData.workspace);
        setMemberRole(appData.memberRole);
        setPendingMembers(appData.pendingMembers);
        setShiftTypes(appData.shiftTypes);
        setEmployees(appData.employees);
        setSchedules(appData.schedules);
        setPatternTemplates(appData.patternTemplates);
      } catch (error) {
        if (!isCancelled) {
          setDataError(error.message || "데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!isCancelled) {
          setDataLoading(false);
          setHasLoadedData(true);
          setLoadedUserId(userId);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [isSupabaseConfigured, reloadKey, userId]);

  if (authLoading) {
    return <AppShellMessage title="로그인 상태를 확인하고 있습니다." />;
  }

  if (!isSupabaseConfigured || !user) {
    return <AuthPage />;
  }

  if (dataLoading || !hasLoadedData || loadedUserId !== userId) {
    return (
      <AppShellMessage
        title="근무표를 준비하고 있어요"
        description="잠시만 기다려주세요."
      />
    );
  }

  if (dataError) {
    return (
      <AppShellMessage
        title="데이터를 불러오지 못했습니다."
        description={dataError}
        actionLabel="다시 시도"
        onAction={() => setReloadKey((prev) => prev + 1)}
      />
    );
  }

  if (!workspace) {
    return (
      <WorkspaceSetupPage
        onComplete={() => setReloadKey((prev) => prev + 1)}
      />
    );
  }

  if (memberRole === "PENDING") {
    return <PendingApprovalPage workspace={workspace} />;
  }

  const reloadData = () => setReloadKey((prev) => prev + 1);

  const handleApproveMember = async (targetUserId, targetEmployeeId) => {
    await approveWorkspaceMember(workspace.id, targetUserId, targetEmployeeId);
    reloadData();
  };

  const handleRejectMember = async (targetUserId) => {
    await rejectWorkspaceMember(workspace.id, targetUserId);
    reloadData();
  };

  const isAdmin = memberRole === "ADMIN";

  return (
    <BrowserRouter>
      <MainLayout memberRole={memberRole}>
        <Routes>
          <Route
            path="/"
            element={
              <CalendarPage
                workspace={workspace}
                shiftTypes={shiftTypes}
                employees={employees}
                schedules={schedules}
                setSchedules={setSchedules}
                patternTemplates={patternTemplates}
                onDataChanged={reloadData}
                canManage={isAdmin}
              />
            }
          />
          <Route
            path="/stats"
            element={
              <StatsPage schedules={schedules} employees={employees} />
            }
          />
          <Route
            path="/employees"
            element={
              isAdmin ? (
                <EmployeesPage
                  workspace={workspace}
                  employees={employees}
                  setEmployees={setEmployees}
                  schedules={schedules}
                  setSchedules={setSchedules}
                  onDataChanged={reloadData}
                />
              ) : (
                <AdminOnlyPage />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAdmin ? (
                <SettingsPage
                  shiftTypes={shiftTypes}
                  setShiftTypes={setShiftTypes}
                  employees={employees}
                  schedules={schedules}
                  setSchedules={setSchedules}
                  patternTemplates={patternTemplates}
                  setPatternTemplates={setPatternTemplates}
                  workspace={workspace}
                  memberRole={memberRole}
                  pendingMembers={pendingMembers}
                  onApproveMember={handleApproveMember}
                  onRejectMember={handleRejectMember}
                  onDataChanged={reloadData}
                />
              ) : (
                <AdminOnlyPage />
              )
            }
          />
          <Route path="/help" element={isAdmin ? <HelpPage /> : <AdminOnlyPage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

function AdminOnlyPage() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 150px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px 18px",
      }}
    >
      <div
        style={{
          width: "100%",
          background: "rgba(248, 249, 251, 0.86)",
          border: "1px solid #e9ecef",
          borderRadius: "18px",
          backdropFilter: "blur(8px)",
          padding: "24px 18px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "999px",
            background: "#edf4ff",
            color: "#3182f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <FiLock size={20} />
        </div>
        <div
          style={{
            color: "#191f28",
            fontSize: "18px",
            fontWeight: "900",
            marginBottom: "6px",
          }}
        >
          관리자 권한이 필요합니다
        </div>
        <div
          style={{
            color: "#868e96",
            fontSize: "13px",
            fontWeight: "700",
            lineHeight: "1.45",
          }}
        >
          직원 관리와 설정은 관리자만 볼 수 있습니다.
        </div>
      </div>
    </div>
  );
}

function AppShellMessage({ title, description, actionLabel, onAction }) {
  return (
    <div
      style={{
        maxWidth: "430px",
        minHeight: "100vh",
        margin: "0 auto",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div>
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "16px",
            background: "#edf4ff",
            color: "#3182f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <FiCalendar size={22} />
        </div>
        <div
          style={{
            color: "#191f28",
            fontSize: "18px",
            fontWeight: "900",
            marginBottom: description ? "8px" : 0,
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              color: "#868e96",
              fontSize: "13px",
              fontWeight: "700",
              lineHeight: "1.45",
              marginBottom: "14px",
            }}
          >
            {description}
          </div>
        )}
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            style={{
              border: "none",
              background: "#3182f6",
              color: "#fff",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "900",
              padding: "10px 14px",
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default AppRouter;
