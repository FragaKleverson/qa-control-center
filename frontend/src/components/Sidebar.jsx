import { Link } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
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
    </aside>
  );
}