import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Sidebar.css";

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <h2>QA Control</h2>

      <nav>
        <Link to="/">📊 Dashboard</Link>

        <Link to="/projects">
          📁 Projects
        </Link>

        <Link to="/requirements">
          📝 Requirements
        </Link>

        <Link to="/test-cases">
          🧪 Test Cases
        </Link>

        <Link to="/test-suites">
          📦 Test Suites
        </Link>

        <Link to="/test-plans">
          📋 Test Plans
        </Link>

        <Link to="/executions">
          🚀 Executions
        </Link>

        <Link to="/reports">
          📈 Reports
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout} title="Sair">
          ⏏
        </button>
      </div>
    </aside>
  );
}