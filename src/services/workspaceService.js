import {
  defaultEmployees,
  defaultPatternTemplates,
  defaultSchedules,
  defaultShiftTypes,
} from "../data/defaultData";
import { supabase } from "../lib/supabase";

export async function loadWorkspaceAppData() {
  const membership = await getCurrentWorkspaceMembership();

  if (!membership) {
    return {
      workspace: null,
      memberRole: null,
      pendingMembers: [],
      employees: defaultEmployees,
      shiftTypes: defaultShiftTypes,
      schedules: defaultSchedules,
      patternTemplates: defaultPatternTemplates,
    };
  }

  const { workspace, role } = membership;

  if (role === "PENDING") {
    return {
      workspace,
      memberRole: role,
      pendingMembers: [],
      employees: defaultEmployees,
      shiftTypes: defaultShiftTypes,
      schedules: defaultSchedules,
      patternTemplates: defaultPatternTemplates,
    };
  }

  await seedDefaultShiftTypesIfNeeded(workspace.id);

  const [employees, shiftTypes, schedules, patternTemplates, pendingMembers] =
    await Promise.all([
      fetchEmployees(workspace.id),
      fetchShiftTypes(workspace.id),
      fetchSchedules(workspace.id),
      fetchPatternTemplates(workspace.id),
      role === "ADMIN" ? fetchPendingMembers(workspace.id) : [],
    ]);

  return {
    workspace,
    memberRole: role,
    pendingMembers,
    employees,
    shiftTypes,
    schedules,
    patternTemplates,
  };
}

export async function approveWorkspaceMember(workspaceId, userId) {
  const { error } = await supabase.rpc("approve_workspace_member", {
    target_workspace_id: workspaceId,
    target_user_id: userId,
  });

  if (error) throw error;
}

export async function rejectWorkspaceMember(workspaceId, userId) {
  const { error } = await supabase.rpc("reject_workspace_member", {
    target_workspace_id: workspaceId,
    target_user_id: userId,
  });

  if (error) throw error;
}

export async function createWorkspace(workspaceName) {
  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: workspaceName,
  });

  if (error) throw error;
}

export async function joinWorkspaceByInviteCode(inviteCode) {
  const { error } = await supabase.rpc("join_workspace_by_code", {
    input_invite_code: inviteCode,
  });

  if (error) throw error;
}

export async function createEmployee(workspaceId, employee, sortOrder) {
  const { error } = await supabase.from("employees").insert({
    workspace_id: workspaceId,
    name: employee.name,
    role: employee.role,
    sort_order: sortOrder,
  });

  if (error) throw error;
}

export async function deleteEmployee(employeeId) {
  const { error } = await supabase.from("employees").delete().eq("id", employeeId);

  if (error) throw error;
}

export async function updateEmployeeOrder(employees) {
  const updates = employees.map((employee, index) =>
    supabase
      .from("employees")
      .update({ sort_order: index })
      .eq("id", employee.id),
  );
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;

  if (error) throw error;
}

export async function saveShiftType(workspaceId, shiftType, sortOrder) {
  const payload = {
    workspace_id: workspaceId,
    name: shiftType.name,
    icon: shiftType.icon,
    color: shiftType.color,
    category: shiftType.category,
    start_time: shiftType.category === "WORK" ? shiftType.startTime : null,
    end_time: shiftType.category === "WORK" ? shiftType.endTime : null,
    sort_order: sortOrder,
  };
  const query = shiftType.id
    ? supabase.from("shift_types").update(payload).eq("id", shiftType.id)
    : supabase.from("shift_types").insert(payload);
  const { error } = await query;

  if (error) throw error;
}

export async function deleteShiftType(shiftTypeId) {
  const { error } = await supabase
    .from("shift_types")
    .delete()
    .eq("id", shiftTypeId);

  if (error) throw error;
}

export async function updateShiftTypeOrder(shiftTypes) {
  const updates = shiftTypes
    .filter((shiftType) => shiftType.id)
    .map((shiftType, index) =>
      supabase
        .from("shift_types")
        .update({ sort_order: index })
        .eq("id", shiftType.id),
    );
  const results = await Promise.all(updates);
  const error = results.find((result) => result.error)?.error;

  if (error) throw error;
}

export async function savePatternTemplate(workspaceId, pattern, shiftTypes) {
  const templatePayload = {
    workspace_id: workspaceId,
    name: pattern.name,
  };
  const templateQuery = pattern.id
    ? supabase
        .from("pattern_templates")
        .update(templatePayload)
        .eq("id", pattern.id)
        .select("id")
        .single()
    : supabase
        .from("pattern_templates")
        .insert(templatePayload)
        .select("id")
        .single();
  const { data: template, error: templateError } = await templateQuery;

  if (templateError) throw templateError;

  const patternId = template.id;
  const { error: deleteError } = await supabase
    .from("pattern_template_days")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("pattern_template_id", patternId);

  if (deleteError) throw deleteError;

  const days = pattern.days
    .map((shiftTypeName, weekday) => {
      const shiftType = shiftTypes.find((item) => item.name === shiftTypeName);

      if (!shiftType?.id) return null;

      return {
        workspace_id: workspaceId,
        pattern_template_id: patternId,
        weekday,
        shift_type_id: shiftType.id,
      };
    })
    .filter(Boolean);

  if (days.length === 0) return;

  const { error: insertError } = await supabase
    .from("pattern_template_days")
    .insert(days);

  if (insertError) throw insertError;
}

export async function deletePatternTemplate(patternId) {
  const { error } = await supabase
    .from("pattern_templates")
    .delete()
    .eq("id", patternId);

  if (error) throw error;
}

export async function saveSchedule(workspaceId, date, schedule) {
  const payload = buildSchedulePayload(workspaceId, date, schedule);

  const { error } = await supabase
    .from("schedules")
    .upsert(payload, {
      onConflict: "workspace_id,employee_id,work_date",
    });

  if (error) throw error;
}

export async function saveSchedules(workspaceId, items) {
  const payloads = items.map((item) =>
    buildSchedulePayload(workspaceId, item.date, item.schedule),
  );

  if (payloads.length === 0) return;

  const { error } = await supabase.from("schedules").upsert(payloads, {
    onConflict: "workspace_id,employee_id,work_date",
  });

  if (error) throw error;
}

export async function deleteSchedule(scheduleId) {
  const { error } = await supabase.from("schedules").delete().eq("id", scheduleId);

  if (error) throw error;
}

async function getCurrentWorkspaceMembership() {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
        role,
        user_email,
        workspaces (
          id,
          name,
          invite_code,
          owner_id
        )
      `,
    )
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  if (data.length === 0) return null;

  return {
    role: data[0].role,
    workspace: data[0].workspaces,
  };
}

async function seedDefaultShiftTypesIfNeeded(workspaceId) {
  const { count, error } = await supabase
    .from("shift_types")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  if (count && count > 0) return;

  const { error: insertError } = await supabase.from("shift_types").insert(
    defaultShiftTypes.map((shiftType, index) => ({
      workspace_id: workspaceId,
      name: shiftType.name,
      icon: shiftType.icon,
      color: shiftType.color,
      category: shiftType.category,
      start_time: shiftType.startTime || null,
      end_time: shiftType.endTime || null,
      sort_order: index,
    })),
  );

  if (insertError) throw insertError;
}

async function fetchEmployees(workspaceId) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, role, sort_order")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data.map((employee) => ({
    id: employee.id,
    name: employee.name,
    role: employee.role,
  }));
}

async function fetchPendingMembers(workspaceId) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, user_email, created_at")
    .eq("workspace_id", workspaceId)
    .eq("role", "PENDING")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data.map((member) => ({
    userId: member.user_id,
    email: member.user_email || "이메일 없음",
    createdAt: member.created_at,
  }));
}

async function fetchShiftTypes(workspaceId) {
  const { data, error } = await supabase
    .from("shift_types")
    .select("id, name, icon, color, category, start_time, end_time, sort_order")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data.map(mapShiftType);
}

async function fetchSchedules(workspaceId) {
  const { data, error } = await supabase
    .from("schedules")
    .select(
      `
        id,
        employee_id,
        shift_type_id,
        work_date,
        start_time,
        end_time,
        category,
        employees ( name ),
        shift_types ( name, icon, color, category )
      `,
    )
    .eq("workspace_id", workspaceId)
    .order("work_date", { ascending: true });

  if (error) throw error;

  return data.reduce((acc, schedule) => {
    const dateKey = schedule.work_date;
    const shiftType = schedule.shift_types;
    const employee = schedule.employees;

    if (!acc[dateKey]) acc[dateKey] = [];

    acc[dateKey].push({
      id: schedule.id,
      employeeId: schedule.employee_id,
      shiftTypeId: schedule.shift_type_id,
      name: employee?.name || "이름 없음",
      type: shiftType?.name || "근무유형 없음",
      icon: shiftType?.icon || "*",
      color: shiftType?.color || "#3182f6",
      category: schedule.category || shiftType?.category || "WORK",
      startTime: formatTimeToMinute(schedule.start_time),
      endTime: formatTimeToMinute(schedule.end_time),
    });

    return acc;
  }, {});
}

async function fetchPatternTemplates(workspaceId) {
  const { data, error } = await supabase
    .from("pattern_templates")
    .select(
      `
        id,
        name,
        pattern_template_days (
          weekday,
          shift_types ( name )
        )
      `,
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data.map((pattern) => {
    const days = Array(7).fill("");

    pattern.pattern_template_days?.forEach((day) => {
      days[day.weekday] = day.shift_types?.name || "";
    });

    return {
      id: pattern.id,
      name: pattern.name,
      days,
    };
  });
}

function mapShiftType(shiftType) {
  return {
    id: shiftType.id,
    name: shiftType.name,
    icon: shiftType.icon,
    color: shiftType.color,
    category: shiftType.category,
    startTime: formatTimeToMinute(shiftType.start_time),
    endTime: formatTimeToMinute(shiftType.end_time),
  };
}

function buildSchedulePayload(workspaceId, date, schedule) {
  if (!schedule.employeeId || !schedule.shiftTypeId) {
    throw new Error("직원 또는 근무유형 정보를 찾을 수 없습니다.");
  }

  const isWork = schedule.category === "WORK";

  return {
    workspace_id: workspaceId,
    employee_id: schedule.employeeId,
    shift_type_id: schedule.shiftTypeId,
    work_date: date,
    start_time: isWork ? schedule.startTime || null : null,
    end_time: isWork ? schedule.endTime || null : null,
    category: schedule.category,
  };
}

function formatTimeToMinute(time) {
  if (!time) return "";

  return String(time).slice(0, 5);
}
