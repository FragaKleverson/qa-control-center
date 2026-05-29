import { Routes, Route } from "react-router-dom";

import Layout from "../components/Layout";

import Dashboard from "../pages/Dashboard";
import Projects from "../pages/Projects";
import Requirements from "../pages/Requirements";
import TestCases from "../pages/TestCases";
import TestSuites from "../pages/TestSuites";
import TestPlan from "../pages/TestPlan";
import Executions from "../pages/Executions";
import Reports from "../pages/Reports";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/projects"
          element={<Projects />}
        />

        <Route
          path="/requirements"
          element={<Requirements />}
        />

        <Route
          path="/test-cases"
          element={<TestCases />}
        />

        <Route
          path="/test-suites"
          element={<TestSuites />}
        />

        <Route
          path="/test-plans"
          element={<TestPlan />}
        />

        <Route
          path="/executions"
          element={<Executions />}
        />

        <Route
          path="/reports"
          element={<Reports />}
        />
      </Route>
    </Routes>
  );
}