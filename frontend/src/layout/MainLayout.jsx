import Sidebar from "./Sidebar";
import "./MainLayout.css";

export default function MainLayout({ children }) {
  return (
    <div className="layout">
      <Sidebar />

      <main className="content">
        {children}
      </main>
    </div>
  );
}