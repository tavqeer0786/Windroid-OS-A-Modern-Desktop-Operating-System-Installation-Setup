import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCw, Globe, Plus, X, Lock, Search, 
  Bookmark, ShieldCheck, Download, ExternalLink, Cpu, BookOpen, Layers, Check, Save
} from 'lucide-react';
import { DesktopShortcutService } from '../../../services/DesktopShortcutService';

interface TabData {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  content: string;
  docData?: {
    id?: string;
    name: string;
    extension: string;
    content: string;
    metadata?: any;
  };
}

interface BrowserAppProps {
  initialState?: {
    action?: string;
    docViewer?: boolean;
    doc?: {
      id?: string;
      name: string;
      extension: string;
      content: string;
      metadata?: any;
    };
  };
}

export const BrowserApp: React.FC<BrowserAppProps> = ({ initialState }) => {
  const initialDoc = initialState?.doc;
  const initialTabs: TabData[] = initialDoc
    ? [
        {
          id: 'tab_doc_1',
          title: initialDoc.name,
          url: `file:///WindroidOS/Documents/${initialDoc.name}`,
          content: 'doc_viewer',
          docData: initialDoc
        }
      ]
    : [
        {
          id: 'tab_1',
          title: 'Windroid OS — Home',
          url: 'https://windroid-os.org/start',
          content: 'start'
        }
      ];

  const [tabs, setTabs] = useState<TabData[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialTabs[0].id);
  const [urlInput, setUrlInput] = useState<string>(initialTabs[0].url);
  const [isPrivate, setIsPrivate] = useState<boolean>(initialState?.action === 'private_tab');
  const [copied, setCopied] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const [docContent, setDocContent] = useState<string>(activeTab.docData?.content || '');
  const [isSaved, setIsSaved] = useState<boolean>(true);

  useEffect(() => {
    if (activeTab.docData) {
      setDocContent(activeTab.docData.content || '');
      setIsSaved(true);
    }
  }, [activeTab.docData?.id, activeTab.docData?.content]);

  const handleSaveDoc = () => {
    if (activeTab.docData?.id) {
      DesktopShortcutService.getInstance().updateTextFileContent(activeTab.docData.id, docContent);
      setIsSaved(true);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId && t.docData
            ? { ...t, docData: { ...t.docData, content: docContent } }
            : t
        )
      );
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (activeTab.content === 'doc_viewer' && activeTab.docData) {
          e.preventDefault();
          handleSaveDoc();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, docContent]);

  const handleAddTab = () => {
    const newId = `tab_${Date.now()}`;
    const newTab: TabData = {
      id: newId,
      title: 'New Tab',
      url: 'https://windroid-os.org/start',
      content: 'start'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setUrlInput(newTab.url);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
      setUrlInput(remaining[remaining.length - 1].url);
    }
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let dest = urlInput.trim();
    if (!dest.startsWith('http://') && !dest.startsWith('https://')) {
      dest = `https://${dest}`;
    }

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            url: dest,
            title: dest.replace('https://', '').split('/')[0],
            content: dest.includes('news') ? 'news' : dest.includes('docs') ? 'docs' : 'custom'
          };
        }
        return t;
      })
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 select-none">
      {/* Tab Bar */}
      <div className="h-10 px-2 flex items-center gap-1 bg-slate-200 dark:bg-slate-950 border-b border-slate-300 dark:border-slate-800 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                setUrlInput(tab.url);
              }}
              className={`h-8 px-3 rounded-t-xl flex items-center gap-2 text-xs font-medium cursor-pointer transition-colors max-w-[180px] shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-t border-x border-slate-300 dark:border-slate-800 shadow-xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-300/60 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={handleAddTab}
          className="p-1.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          title="New Tab"
        >
          <Plus className="w-4 h-4" />
        </button>

        {isPrivate && (
          <div className="ml-auto px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1">
            <Lock className="w-3 h-3" /> Private Mode
          </div>
        )}
      </div>

      {/* URL Navigation & Address Bar */}
      <div className="h-11 px-3 flex items-center gap-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer" title="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer" title="Forward">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer" title="Reload">
          <RotateCw className="w-4 h-4" />
        </button>

        <form onSubmit={handleNavigate} className="flex-1 flex items-center">
          <div className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500">
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full text-xs font-mono bg-transparent focus:outline-none text-slate-800 dark:text-slate-100"
            />
          </div>
        </form>

        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer" title="Bookmark">
          <Bookmark className="w-4 h-4" />
        </button>
      </div>

      {/* Page Content Viewport */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
        {activeTab.content === 'start' ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-6 py-4">
            <div className="text-center flex flex-col items-center gap-2">
              <div className="p-3.5 rounded-2xl bg-blue-600 text-white shadow-lg">
                <Globe className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Windroid Browser</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lightweight, private and fast desktop web experience.
              </p>
            </div>

            {/* Quick Link Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setUrlInput('https://news.windroid-os.org');
                  setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, url: 'https://news.windroid-os.org', title: 'Tech News', content: 'news' } : t)));
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all text-left flex flex-col gap-2 cursor-pointer shadow-2xs"
              >
                <Cpu className="w-5 h-5 text-blue-500" />
                <div className="text-xs font-semibold">Linux & Tech News</div>
                <div className="text-[11px] text-slate-500">Latest kernel updates & hardware benchmarks.</div>
              </button>

              <button
                onClick={() => {
                  setUrlInput('https://docs.windroid-os.org');
                  setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, url: 'https://docs.windroid-os.org', title: 'Windroid OS Docs', content: 'docs' } : t)));
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all text-left flex flex-col gap-2 cursor-pointer shadow-2xs"
              >
                <BookOpen className="w-5 h-5 text-emerald-500" />
                <div className="text-xs font-semibold">Developer Guide</div>
                <div className="text-[11px] text-slate-500">Architecture, API surface, and UI specs.</div>
              </button>

              <button
                onClick={() => {
                  setUrlInput('https://github.com/windroid-os');
                  setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, url: 'https://github.com/windroid-os', title: 'GitHub', content: 'docs' } : t)));
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all text-left flex flex-col gap-2 cursor-pointer shadow-2xs"
              >
                <Layers className="w-5 h-5 text-purple-500" />
                <div className="text-xs font-semibold">Open Source Portal</div>
                <div className="text-[11px] text-slate-500">Contribute to compositor & system packages.</div>
              </button>
            </div>
          </div>
        ) : activeTab.content === 'doc_viewer' && activeTab.docData ? (
          <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-150">
            {/* Document Header Toolbar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold uppercase">
                  .{activeTab.docData.extension}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {activeTab.docData.name}
                    {activeTab.docData.metadata?.pages && (
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {activeTab.docData.metadata.pages} Page{activeTab.docData.metadata.pages > 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-0.5 font-mono">
                    <span>Encoding: {activeTab.docData.metadata?.encoding || 'UTF-8'}</span>
                    <span>Language: {activeTab.docData.metadata?.language || activeTab.docData.extension.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDoc}
                  disabled={isSaved}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSaved
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaved ? 'Saved' : 'Save (Ctrl+S)'}
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(docContent || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Content'}
                </button>
              </div>
            </div>

            {/* Document Content View */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-200 min-h-[400px]">
              {activeTab.docData.extension === 'pdf' ? (
                <div className="space-y-4 text-center py-6">
                  <div className="p-4 rounded-full bg-red-500/10 text-red-500 w-16 h-16 mx-auto flex items-center justify-center">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">PDF Document Preview Engine</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {activeTab.docData.content || 'Windroid OS Embedded PDF Viewer — 12 Pages, Document Standard 1.7'}
                  </p>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs text-left max-w-lg mx-auto border border-slate-200 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
                    {activeTab.docData.content || `SECTION 1: ARCHITECTURE HIGHLIGHTS\n1.1 Full Multi-App Desktop Compositor\n1.2 Isolated Sandbox Environment\n1.3 Developer Media Library Integrations`}
                  </div>
                </div>
              ) : activeTab.docData.extension === 'md' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center font-mono text-[11px] text-blue-600 font-semibold uppercase tracking-wider">
                    <span>MARKDOWN TEXT EDITOR</span>
                    <span>{docContent.length} characters</span>
                  </div>
                  <textarea
                    value={docContent}
                    onChange={(e) => {
                      setDocContent(e.target.value);
                      setIsSaved(false);
                    }}
                    placeholder="Type document content here..."
                    className="w-full h-80 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-y-auto border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none"
                  />
                </div>
              ) : ['json', 'html', 'css', 'js', 'tsx'].includes(activeTab.docData.extension) ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                    <span>CODE EDITOR ({activeTab.docData.extension.toUpperCase()})</span>
                    <span>{docContent.length} bytes</span>
                  </div>
                  <textarea
                    value={docContent}
                    onChange={(e) => {
                      setDocContent(e.target.value);
                      setIsSaved(false);
                    }}
                    placeholder="Type code here..."
                    className="w-full h-80 p-4 rounded-xl bg-slate-950 text-blue-300 font-mono text-xs overflow-y-auto border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                    <span>TEXT EDITOR</span>
                    <span>{docContent.length} characters</span>
                  </div>
                  <textarea
                    value={docContent}
                    onChange={(e) => {
                      setDocContent(e.target.value);
                      setIsSaved(false);
                    }}
                    placeholder="Type document content here..."
                    className="w-full h-80 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-xs overflow-y-auto border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        ) : activeTab.content === 'news' ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              Linux & Open Source News
            </h3>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-blue-600">AUGUST 2026</span>
              <h4 className="font-semibold text-sm">Linux Kernel 6.12 Released with Real-Time Scheduling Preemption</h4>
              <p className="text-xs text-slate-500">
                The latest LTS kernel introduces official PREEMPT_RT patches mainline, reducing latency for desktop compositors and embedded UI systems.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Globe className="w-8 h-8 text-blue-500 mx-auto" />
            <h3 className="font-bold text-sm">Simulated Web Page</h3>
            <p className="text-xs font-mono text-slate-500">{activeTab.url}</p>
            <p className="text-xs text-slate-400">
              Web browsing in this prototype environment renders simulated responsive web content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
