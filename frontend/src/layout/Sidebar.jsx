import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h2 className="logo">QA Control</h2>

      <nav>
        <ul>
          <li>📊 Dashboard</li>
          <li>📁 Projects</li>
          <li>🧪 Test Cases</li>
          <li>📦 Test Suites</li>
          <li>🚀 Test Execution</li>
          <li>📈 Reports</li>
          <li>🔍 Search</li>
        </ul>
      </nav>
    </aside>
  );
}