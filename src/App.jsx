import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useStore from './store/useStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import ProjectDetail from './components/project/ProjectDetail';
import ProgramView from './components/program/ProgramView';
import SettingsView from './components/settings/SettingsView';
import AskAiPanel from './components/shared/AskAiPanel';

export default function App() {
  const isLoaded = useStore((s) => s.isLoaded);
  const initFromLocalStorage = useStore((s) => s.initFromLocalStorage);
  const askAiOpen = useStore((s) => s.askAiOpen);

  useEffect(() => {
    initFromLocalStorage();
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold font-headline">The Governance Desk</h1>
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#fdfcfb]">
        <Routes>
          <Route
            path="/project/:projectId"
            element={
              <>
                <main className="flex-1 flex flex-col min-w-0">
                  <Header />
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <ProjectDetail />
                  </div>
                </main>
              </>
            }
          />
          <Route
            path="*"
            element={
              <>
                <Sidebar />
                <main className="flex-1 flex flex-col min-w-0">
                  <Header />
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route path="program" element={<ProgramView />} />
                      <Route path="settings" element={<SettingsView />} />
                    </Routes>
                  </div>
                </main>
              </>
            }
          />
        </Routes>
        {askAiOpen && <AskAiPanel />}
      </div>
    </BrowserRouter>
  );
}
