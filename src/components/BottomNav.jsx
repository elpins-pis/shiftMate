import { NavLink, useLocation } from "react-router-dom";

function BottomNav({ memberRole }) {
  const location = useLocation();
  const isAdmin = memberRole === "ADMIN";
  const navStyle = ({ isActive }) => ({
    flex: 1,
    textAlign: "center",
    textDecoration: "none",
    color: isActive ? "#3182f6" : "#868e96",
    fontSize: "14px",
    fontWeight: isActive ? "800" : "700",
  });

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        width: "100%",
        maxWidth: "430px",
        display: "flex",
        justifyContent: "space-around",
        padding: "14px 0",
        background: "#fff",
        borderTop: "1px solid #eee",
      }}
    >
      <NavLink to="/" style={navStyle}>
        달력
      </NavLink>

      <NavLink to="/stats" style={navStyle}>
        통계
      </NavLink>

      {isAdmin && (
        <NavLink to="/employees" style={navStyle}>
          직원
        </NavLink>
      )}

      {isAdmin && (
        <NavLink
          to="/settings"
          style={({ isActive }) =>
            navStyle({ isActive: isActive || location.pathname === "/help" })
          }
        >
          설정
        </NavLink>
      )}
    </nav>
  );
}

export default BottomNav;
