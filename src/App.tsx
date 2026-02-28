/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GitBranch, 
  Phone, 
  BookOpen, 
  Settings, 
  Megaphone,
  MessageSquare,
  HelpCircle,
  Menu,
  ChevronRight,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import type { Agent, PhoneNumber, KnowledgeBaseItem, Campaign, CallLog } from './types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

type Tab = 'dashboard' | 'agents' | 'workflow' | 'phone-numbers' | 'knowledge-base' | 'integrations' | 'campaigns';


export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCallLogId, setSelectedCallLogId] = useState<string | null>(null);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [agentsRes, phoneRes, kbRes, campaignsRes, statsRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/phone-numbers'),
        fetch('/api/knowledge-base'),
        fetch('/api/campaigns'),
        fetch('/api/stats')
      ]);

      if (!agentsRes.ok || !phoneRes.ok || !kbRes.ok || !campaignsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const [agentsData, phoneData, kbData, campaignsData, statsData] = await Promise.all([
        agentsRes.json(),
        phoneRes.json(),
        kbRes.json(),
        campaignsRes.json(),
        statsRes.json()
      ]);

      setAgents(agentsData);
      setPhoneNumbers(phoneData);
      setKnowledgeBase(kbData);
      setCampaigns(campaignsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAgent = async (type: Agent['type']) => {
    const name = prompt(`Enter ${type.replace('_', ' ')} name:`);
    if (!name) return;
    
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, gender: 'Female' })
      });
      if (!res.ok) throw new Error('Failed to create agent');
      await fetchData();
      setActiveModal(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (resource: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`/api/${resource}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete ${resource}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerifyNumber = async (id: string) => {
    try {
      const res = await fetch(`/api/phone-numbers/${id}/verify`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Verification failed');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'workflow', label: 'Workflow', icon: GitBranch },
    { id: 'phone-numbers', label: 'Phone Numbers', icon: Phone },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
    { id: 'integrations', label: 'Integrations', icon: Settings },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  ];

  return (
    <div className="flex h-screen bg-[#F9FAFB] text-[#111827] font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center text-white font-bold">
            Γ
          </div>
          {isSidebarOpen && <span className="text-xl font-bold tracking-tight">Gamma</span>}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            {isSidebarOpen ? 'Platform' : '...'}
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as Tab); setSelectedCampaignId(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                activeTab === item.id 
                  ? "bg-[#F3E8FF] text-[#7C3AED]" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-[#7C3AED]" : "text-gray-400 group-hover:text-gray-600")} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
              SM
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">saurabh.mehta</p>
                <p className="text-xs text-gray-500 truncate">saurabh.mehta@gamma.ai</p>
              </div>
            )}
            {isSidebarOpen && <MoreHorizontal className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h1>
          </div>
          <div className="flex items-center gap-4 relative">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED] w-64"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                className="bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
              
              {showCreateDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
                  {activeTab === 'agents' && (
                    <>
                      <button onClick={() => { handleCreateAgent('phone'); setShowCreateDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Create Phone Agent</button>
                      <button onClick={() => { handleCreateAgent('whatsapp'); setShowCreateDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Create WhatsApp Agent</button>
                      <button onClick={() => { handleCreateAgent('voice_blaster'); setShowCreateDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Create Voice Blaster</button>
                    </>
                  )}
                  {activeTab === 'phone-numbers' && (
                    <>
                      <button onClick={() => { setActiveModal('add-phone'); setShowCreateDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Add Phone Number</button>
                      <button onClick={() => { setActiveModal('add-whatsapp'); setShowCreateDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Add WhatsApp Number</button>
                    </>
                  )}
                  {activeTab === 'knowledge-base' && (
                    <button onClick={() => { setActiveModal('create-kb'); setShowCreateDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Create Knowledge Base</button>
                  )}
                  {activeTab === 'campaigns' && (
                    <button onClick={() => { setActiveModal('create-campaign'); setShowCreateDropdown(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Create Campaign</button>
                  )}
                  {activeTab === 'dashboard' && (
                    <div className="px-4 py-2 text-xs text-gray-400">Select a tab to create items</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="m-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-600">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-8 max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + (selectedCampaignId || '')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'dashboard' && <DashboardView stats={stats} campaigns={campaigns} onSelectCampaign={setSelectedCampaignId} />}
                {activeTab === 'agents' && <AgentsView agents={agents} onDelete={(id) => handleDelete('agents', id)} onOpenCreate={() => setActiveModal('create-agent-wizard')} />}
                {activeTab === 'workflow' && <ComingSoonView title="Workflow Management" />}
                {activeTab === 'phone-numbers' && (
                  <PhoneNumbersView 
                    phoneNumbers={phoneNumbers} 
                    agents={agents} 
                    onDelete={(id) => handleDelete('phone-numbers', id)}
                    onVerify={handleVerifyNumber}
                    onOpenAdd={(type) => setActiveModal(type === 'whatsapp' ? 'add-whatsapp' : 'add-phone')}
                  />
                )}
                {activeTab === 'knowledge-base' && <KnowledgeBaseView knowledgeBase={knowledgeBase} onDelete={(id) => handleDelete('knowledge-base', id)} onOpenCreate={() => setActiveModal('create-kb')} />}
                {activeTab === 'integrations' && <IntegrationsView />}
                {activeTab === 'campaigns' && (
                  selectedCampaignId ? (
                    <CampaignAnalysisView 
                      campaignId={selectedCampaignId} 
                      onBack={() => setSelectedCampaignId(null)} 
                    />
                  ) : (
                    <CampaignsView 
                      campaigns={campaigns} 
                      onSelectCampaign={(id) => setSelectedCampaignId(id)}
                      onDelete={(id) => handleDelete('campaigns', id)}
                      onOpenCreate={() => setActiveModal('create-campaign')}
                    />
                  )
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Modals */}
      {activeModal === 'create-agent-wizard' && (
        <CreateAgentWizardModal 
          onClose={() => setActiveModal(null)}
          onSuccess={() => { fetchData(); setActiveModal(null); }}
        />
      )}
      {activeModal === 'add-phone' && (
        <AddPhoneNumberModal 
          type="phone"
          onClose={() => setActiveModal(null)} 
          onSuccess={() => { fetchData(); setActiveModal(null); }} 
        />
      )}
      {activeModal === 'add-whatsapp' && (
        <AddPhoneNumberModal 
          type="whatsapp"
          onClose={() => setActiveModal(null)} 
          onSuccess={() => { fetchData(); setActiveModal(null); }} 
        />
      )}
      {activeModal === 'create-kb' && (
        <CreateKBModal 
          onClose={() => setActiveModal(null)} 
          onSuccess={() => { fetchData(); setActiveModal(null); }} 
        />
      )}
      {activeModal === 'create-campaign' && (
        <CreateCampaignModal 
          onClose={() => setActiveModal(null)} 
          onSuccess={() => { fetchData(); setActiveModal(null); }} 
        />
      )}
    </div>
  );
}

function DashboardView({ stats, campaigns, onSelectCampaign }: { stats: any, campaigns: Campaign[], onSelectCampaign: (id: string) => void }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#111827]">Welcome, saurabh.mehta</h2>
          <p className="text-gray-500">Your personalized dashboard overview</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium shadow-sm">
          <span>Feb 22, 2026 - Mar 1, 2026</span>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Calls" value={stats?.totalCalls || 0} inbound={stats?.inboundCalls || 0} outbound={stats?.outboundCalls || 0} icon={Phone} />
        <StatCard title="Minute Usage" value={`${stats?.totalMinutes || 0}m`} inbound={`${stats?.inboundMinutes || 0}m`} outbound={`${stats?.outboundMinutes || 0}m`} icon={LayoutDashboard} />
        <StatCard title="Concurrency" value={stats?.concurrency || 0} subtitle="Peak active calls" icon={GitBranch} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Usage Analytics</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(stats?.dailyTrend || []).map((d: any) => ({ name: d.day, inbound: d.inbound, outbound: d.outbound }))}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="outbound" stroke="#7C3AED" fillOpacity={1} fill="url(#colorInbound)" strokeWidth={2} />
                <Area type="monotone" dataKey="inbound" stroke="#C084FC" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Call Pickup Rate</h3>
          <div className="flex items-end gap-4 h-[300px]">
            <div className="flex-1 bg-[#F3E8FF] rounded-t-lg h-[15%] relative group">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">15%</div>
            </div>
            <div className="flex-1 bg-gray-100 rounded-t-lg h-[5%]"></div>
            <div className="flex-1 bg-gray-100 rounded-t-lg h-[8%]"></div>
            <div className="flex-1 bg-gray-100 rounded-t-lg h-[12%]"></div>
            <div className="flex-1 bg-gray-100 rounded-t-lg h-[10%]"></div>
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-400">
            <span>Successful</span>
            <span>Failed</span>
            <span>Voicemail</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold">Campaign Status</h3>
            <button className="text-[#7C3AED] text-sm font-medium">View All</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dialed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.slice(0, 5).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelectCampaign(c.id)}>
                  <td className="px-6 py-4 text-sm font-medium">{c.name}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      c.status === 'completed' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                    )}>{c.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{c.leads}</td>
                  <td className="px-6 py-4 text-sm">{c.attempted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold mb-6">Call Outcome</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Normal Call</span>
              <span className="font-bold">100%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-[#7C3AED] h-2 rounded-full w-full"></div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Voicemail</span>
              <span className="font-bold">0%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-gray-200 h-2 rounded-full w-0"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, inbound, outbound, subtitle, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <MoreHorizontal className="w-4 h-4 text-gray-400 cursor-pointer" />
      </div>
      <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
      <div className="text-3xl font-bold mb-4">{value}</div>
      {subtitle ? (
        <div className="text-sm text-gray-400">{subtitle}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
          <div>
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Inbound</div>
            <div className="font-semibold">{inbound}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Outbound</div>
            <div className="font-semibold">{outbound}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentsView({ agents, onDelete, onOpenCreate }: { agents: Agent[], onDelete: (id: string) => void, onOpenCreate: () => void }) {
  const [activeTab, setActiveTab] = useState<'phone' | 'whatsapp'>('phone');

  const filteredAgents = agents.filter(a => a.type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Management</h2>
          <p className="text-gray-500">Set up your AI agent in minutes</p>
        </div>
        <button 
          onClick={onOpenCreate}
          className="bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Agent
        </button>
      </div>

      <div className="flex gap-8 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('phone')}
          className={cn("pb-4 font-medium transition-colors relative flex items-center gap-2", activeTab === 'phone' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          <Phone className="w-4 h-4" />
          Phone Agents
          {activeTab === 'phone' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
        <button 
          onClick={() => setActiveTab('whatsapp')}
          className={cn("pb-4 font-medium transition-colors relative flex items-center gap-2", activeTab === 'whatsapp' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp Agents
          {activeTab === 'whatsapp' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search all columns..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Select Columns
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Edited</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAgents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                      agent.gender === 'Male' ? "bg-blue-500" : "bg-pink-500"
                    )}>
                      {agent.name.charAt(0)}
                    </div>
                    <div className="font-medium">{agent.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    agent.gender === 'Male' ? "text-blue-600 bg-blue-50" : "text-pink-600 bg-pink-50"
                  )}>{agent.gender}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{agent.lastEdited}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{agent.created}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(agent.id)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAgents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">No {activeTab} agents found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhoneNumbersView({ phoneNumbers, agents, onDelete, onVerify, onOpenAdd }: { 
  phoneNumbers: PhoneNumber[], 
  agents: Agent[], 
  onDelete: (id: string) => void,
  onVerify: (id: string) => void,
  onOpenAdd: (type: 'phone' | 'whatsapp') => void
}) {
  const [activeTab, setActiveTab] = useState<'phone' | 'whatsapp'>('phone');

  const filteredNumbers = phoneNumbers.filter(n => n.type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Phone Numbers</h2>
          <p className="text-gray-500">Manage and assign numbers to streamline communication</p>
        </div>
        <div className="relative group">
          <button className="bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Number
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
            <button onClick={() => onOpenAdd('phone')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Add Phone Number
            </button>
            <button onClick={() => onOpenAdd('whatsapp')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Add WhatsApp Number
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('phone')}
          className={cn("pb-4 font-medium transition-colors relative flex items-center gap-2", activeTab === 'phone' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          Phone Numbers ({phoneNumbers.filter(n => n.type === 'phone').length})
          {activeTab === 'phone' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
        <button 
          onClick={() => setActiveTab('whatsapp')}
          className={cn("pb-4 font-medium transition-colors relative flex items-center gap-2", activeTab === 'whatsapp' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          WhatsApp ({phoneNumbers.filter(n => n.type === 'whatsapp').length})
          {activeTab === 'whatsapp' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search all columns..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Select Columns
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service Provider</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inbound Agent</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Outbound Agent</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredNumbers.map((num) => (
              <tr key={num.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {num.provider === 'Plivo' ? (
                      <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-[10px] font-bold">P</div>
                    ) : num.provider === 'Twilio' ? (
                      <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-[10px] font-bold">T</div>
                    ) : num.provider === 'Telnyx' ? (
                      <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold">L</div>
                    ) : (
                      <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-white text-[10px] font-bold">A</div>
                    )}
                    <span className="font-medium">{num.provider}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm">{num.number}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {num.verified ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <button 
                        onClick={() => onVerify(num.id)}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">
                      {agents.find(a => a.id === num.inboundAgentId)?.name || 'Unassigned'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                      {agents.find(a => a.id === num.outboundAgentId)?.name || 'Unassigned'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(num.id)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredNumbers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">No {activeTab} numbers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KnowledgeBaseView({ knowledgeBase, onDelete, onOpenCreate }: { knowledgeBase: KnowledgeBaseItem[], onDelete: (id: string) => void, onOpenCreate: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Base</h2>
          <p className="text-gray-500">Central repository for organizational knowledge</p>
        </div>
        <button 
          onClick={onOpenCreate}
          className="bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Knowledge Base
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search all columns..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Select Columns
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Knowledge Base</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {knowledgeBase.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400">Created: {item.created}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.description}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {knowledgeBase.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">No knowledge base found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IntegrationsView() {
  const [showHubSpot, setShowHubSpot] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');

  if (showHubSpot) {
    return (
      <div className="space-y-8">
        <button onClick={() => setShowHubSpot(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Integrations
        </button>
        
        <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto">
          <img src="https://cdn.worldvectorlogo.com/logos/hubspot.svg" alt="HubSpot" className="w-20 h-20 mb-8" referrerPolicy="no-referrer" />
          <h2 className="text-3xl font-bold mb-4">Connect HubSpot</h2>
          <p className="text-gray-500 mb-8">
            Sync your contacts and automate your sales workflow by connecting your HubSpot account with Gamma.
          </p>
          
          <div className="space-y-4 w-full max-w-sm">
            <button className="w-full py-3 bg-[#FF7A59] text-white rounded-xl font-bold hover:bg-[#e66e50] transition-colors">
              Sign in to your HubSpot account
            </button>
            <button className="w-full py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">
              Create a HubSpot account
            </button>
          </div>
          
          <p className="mt-8 text-xs text-gray-400">
            By connecting, you agree to HubSpot's terms of service and privacy policy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-gray-500">Manage your CRM integrations and forms</p>
      </div>

      <div className="flex gap-8 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('available')}
          className={cn("pb-4 font-medium transition-colors relative", activeTab === 'available' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          Available
          {activeTab === 'available' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
        <button 
          onClick={() => setActiveTab('active')}
          className={cn("pb-4 font-medium transition-colors relative", activeTab === 'active' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          Active
          {activeTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
      </div>

      {activeTab === 'available' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <IntegrationCard 
            name="HubSpot" 
            description="Sync contacts, automate sales with HubSpot." 
            icon="https://cdn.worldvectorlogo.com/logos/hubspot.svg"
            connected={false}
            onConnect={() => { window.location.href = '/api/integrations/hubspot/connect'; }}
          />
          <IntegrationCard 
            name="Custom CRM" 
            description="Connect your own CRM system via API." 
            icon={<Settings className="w-8 h-8 text-gray-400" />}
            connected={false}
          />
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
          <p className="text-gray-400 italic">No active integrations found.</p>
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ name, description, icon, connected, onConnect }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
      <div className="mb-4">
        {typeof icon === 'string' ? (
          <img src={icon} alt={name} className="w-10 h-10" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      <h4 className="text-lg font-semibold mb-2">{name}</h4>
      <p className="text-sm text-gray-500 mb-6 flex-1">{description}</p>
      <button 
        onClick={onConnect}
        className="w-full py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        Connect
      </button>
    </div>
  );
}

function CampaignsView({ campaigns, onSelectCampaign, onDelete, onOpenCreate }: { 
  campaigns: Campaign[], 
  onSelectCampaign: (id: string) => void,
  onDelete: (id: string) => void,
  onOpenCreate: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campaign Management</h2>
          <p className="text-gray-500">Create your own personalized useCases</p>
        </div>
        <button 
          onClick={onOpenCreate}
          className="bg-[#7C3AED] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6D28D9] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search all columns..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          />
        </div>
        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          Select Columns
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Call Statistics</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => onSelectCampaign(campaign.id)}>
                <td className="px-6 py-4 font-medium">{campaign.name}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-4 text-xs">
                    <div>
                      <div className="text-gray-400 uppercase">Leads</div>
                      <div className="font-bold">{campaign.leads}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 uppercase">Attempted</div>
                      <div className="font-bold">{campaign.attempted}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 uppercase">Connected</div>
                      <div className="font-bold">{campaign.connected}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{campaign.created}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium",
                    campaign.status === 'completed' ? "bg-green-50 text-green-600" :
                    campaign.status === 'failed' ? "bg-red-50 text-red-600" :
                    "bg-blue-50 text-blue-600"
                  )}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-gray-600">
                      <LayoutDashboard className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(campaign.id); }} 
                      className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComingSoonView({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
        <GitBranch className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-3xl font-bold mb-2">Coming Soon</h2>
      <p className="text-gray-500 max-w-md">
        {title} is currently under development. Check back soon for exciting new features!
      </p>
    </div>
  );
}

function CampaignAnalysisView({ campaignId, onBack }: { campaignId: string, onBack: () => void }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics'>('analytics');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then(res => res.json())
      .then(data => {
        setCampaign(data);
        setLoading(false);
      });
  }, [campaignId]);

  if (loading || !campaign) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#7C3AED]" /></div>;

  const selectedLog = campaign.logs?.find(l => l.id === selectedLogId);

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{campaign.name}</h2>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium uppercase">{campaign.status}</span>
          </div>
          <p className="text-sm text-gray-500">Created at: {campaign.created}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-1">Start Time</div>
          <div className="font-semibold">{campaign.startTime || '9:00 AM'}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-1">End Time</div>
          <div className="font-semibold">{campaign.endTime || '5:00 PM'}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-1">Calling Days</div>
          <div className="font-semibold">{campaign.callingDays || 'Mon to Fri'}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="text-gray-400 mb-1">Timezone</div>
          <div className="font-semibold">{campaign.timezone || 'Asia/Calcutta'}</div>
        </div>
      </div>

      <div className="flex gap-8 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('logs')}
          className={cn("pb-4 font-medium transition-colors relative", activeTab === 'logs' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          Campaign Logs
          {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={cn("pb-4 font-medium transition-colors relative", activeTab === 'analytics' ? "text-[#7C3AED]" : "text-gray-500")}
        >
          Campaign Analytics
          {activeTab === 'analytics' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-6 flex items-center justify-between">
                Total Calls
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </h3>
              <div className="text-4xl font-bold text-[#7C3AED] mb-8">{campaign.attempted}</div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Inbound</div>
                  <div className="text-xl font-bold">0</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Outbound</div>
                  <div className="text-xl font-bold">{campaign.attempted}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold mb-6 flex items-center justify-between">
                Minute Usage
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </h3>
              <div className="text-4xl font-bold text-[#7C3AED] mb-8">0m</div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Inbound</div>
                  <div className="text-xl font-bold">0m</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Outbound</div>
                  <div className="text-xl font-bold">0m</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold mb-6">Call Status</h3>
              <div className="flex items-center justify-center py-10">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path className="text-gray-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className="text-[#7C3AED]" strokeDasharray={`${(campaign.connected / (campaign.attempted || 1)) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">{campaign.attempted}</div>
                </div>
              </div>
              <div className="flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#7C3AED] rounded-full" /> Completed</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-200 rounded-full" /> Queued</div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold mb-6">Call Outcome</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Normal Call</span>
                  <span className="font-bold">100%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-[#7C3AED] h-2 rounded-full w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attempted Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaign.logs?.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{log.phoneNumber}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium">{log.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.duration}s</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.attemptedTime}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedLogId(log.id)}
                      className="text-[#7C3AED] text-xs font-medium hover:underline"
                    >
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
              {(!campaign.logs || campaign.logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">No logs available for this campaign</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Drawer for detailed logs */}
      <AnimatePresence>
        {selectedLogId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLogId(null)}
              className="fixed inset-0 bg-black/20 z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-[70] p-8 border-l border-gray-200"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Detailed Logs for {selectedLog?.phoneNumber}</h3>
                <button onClick={() => setSelectedLogId(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">Call-Dialed</span>
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase">Passed</span>
                  </div>
                  <div className="text-xs text-gray-500">1 Attempt | N/A</div>
                </div>
                
                <div className="text-center py-10 text-gray-400 text-sm italic">
                  Loading call details...
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddPhoneNumberModal({ type, onClose, onSuccess }: { type: 'phone' | 'whatsapp', onClose: () => void, onSuccess: () => void }) {
  const [provider, setProvider] = useState<'Twilio' | 'Plivo' | 'Telnyx' | 'AirSerey'>(type === 'whatsapp' ? 'AirSerey' : 'Twilio');
  const [number, setNumber] = useState('');
  const [sid, setSid] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // First verify
      const verifyRes = await fetch('/api/phone-numbers/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, sid, token })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) throw new Error(verifyData.error || 'Verification failed');

      // Then save
      await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, provider, number, sid, token })
      });
      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Error adding number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-8">
          <h3 className="text-2xl font-bold mb-6">Connect {type === 'whatsapp' ? 'WhatsApp' : 'Phone'} Number</h3>
          
          <div className="flex gap-4 border-b border-gray-100 mb-6">
            {type === 'phone' ? (
              <>
                <button onClick={() => setProvider('Twilio')} className={cn("pb-2 text-sm font-medium transition-colors relative", provider === 'Twilio' ? "text-[#7C3AED]" : "text-gray-400")}>
                  Twilio {provider === 'Twilio' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
                </button>
                <button onClick={() => setProvider('Plivo')} className={cn("pb-2 text-sm font-medium transition-colors relative", provider === 'Plivo' ? "text-[#7C3AED]" : "text-gray-400")}>
                  Plivo {provider === 'Plivo' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
                </button>
                <button onClick={() => setProvider('Telnyx')} className={cn("pb-2 text-sm font-medium transition-colors relative", provider === 'Telnyx' ? "text-[#7C3AED]" : "text-gray-400")}>
                  Telnyx {provider === 'Telnyx' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />}
                </button>
              </>
            ) : (
              <button className="pb-2 text-sm font-medium text-[#7C3AED] relative">
                AirSerey <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C3AED]" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {provider === 'Twilio' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Account SID *</label>
                <input 
                  type="text" 
                  value={sid} 
                  onChange={(e) => setSid(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Auth Token *</label>
              <input 
                type="password" 
                value={token} 
                onChange={(e) => setToken(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number *</label>
              <input 
                type="text" 
                value={number} 
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                required
              />
            </div>
            
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg font-medium text-sm">Cancel</button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-2 bg-[#7C3AED] text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Connect Service
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CreateAgentWizardModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [useCase, setUseCase] = useState<string | null>(null);
  const [persona, setPersona] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const useCases = [
    { id: 'loan-collection', label: 'Loan Collection', icon: '💰' },
    { id: 'loan-sanctions', label: 'Loan Sanctions', icon: '🏦' },
    { id: 'insurance', label: 'Insurance', icon: '🛡️' },
    { id: 'lead-nurturing', label: 'Lead Nurturing', icon: '📈' },
    { id: 'scratch', label: 'Create From Scratch', icon: '✨' },
  ];

  const personas = [
    { id: 'india-loan', label: 'India Loan Sanction', description: 'A loan sanction agent for India', tags: ['Polite Speaker', 'Polite'] },
    { id: 'uae-loan', label: 'UAE Loan Sanction', description: 'A loan sanction agent for the UAE', tags: ['Polite Speaker', 'Soft'] },
    { id: 'scratch-male', label: 'Scratch Agent Male', description: 'Male Agent (Build this agent from scratch)', tags: ['Confident', 'Reassuring'] },
  ];

  const handleContinue = async () => {
    if (step === 1 && useCase) {
      setStep(2);
    } else if (step === 2 && persona) {
      setLoading(true);
      try {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: personas.find(p => p.id === persona)?.label || 'New Agent', 
            type: 'phone', 
            gender: persona.includes('male') ? 'Male' : 'Female' 
          })
        });
        if (!res.ok) throw new Error('Failed to create agent');
        onSuccess();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold">Create Voice Agent</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>

          <div className="space-y-8">
            <div>
              <div className="text-sm font-bold text-gray-400 uppercase mb-4">1. Select Use Case</div>
              <div className="grid grid-cols-3 gap-4">
                {useCases.map((uc) => (
                  <button 
                    key={uc.id}
                    onClick={() => setUseCase(uc.id)}
                    className={cn(
                      "p-4 border rounded-xl text-left transition-all",
                      useCase === uc.id ? "border-[#7C3AED] bg-[#F3E8FF]" : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="text-2xl mb-2">{uc.icon}</div>
                    <div className="text-sm font-bold">{uc.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-sm font-bold text-gray-400 uppercase mb-4">2. Choose Persona</div>
                <div className="grid grid-cols-2 gap-4">
                  {personas.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => setPersona(p.id)}
                      className={cn(
                        "p-4 border rounded-xl text-left transition-all",
                        persona === p.id ? "border-[#7C3AED] bg-[#F3E8FF]" : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className="font-bold text-sm mb-1">{p.label}</div>
                      <div className="text-xs text-gray-500 mb-3">{p.description}</div>
                      <div className="flex gap-2">
                        {p.tags.map(t => <span key={t} className="px-2 py-0.5 bg-white border border-gray-100 rounded text-[10px] text-gray-400 font-medium">{t}</span>)}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex gap-4 pt-10 border-t border-gray-100 mt-8">
            <button onClick={onClose} className="px-6 py-2 border border-gray-200 rounded-lg font-medium text-sm">Cancel</button>
            <div className="flex-1" />
            <button 
              onClick={handleContinue}
              disabled={loading || (step === 1 && !useCase) || (step === 2 && !persona)}
              className="px-8 py-2 bg-[#7C3AED] text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateKBModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating KB:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold">Create Knowledge Base</h3>
              <p className="text-sm text-gray-500">Create a new knowledge base with documents</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter knowledge base name"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Knowledge base description"
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg h-24 text-sm"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase">Documents *</label>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Give your knowledge base a description to clarify its purpose. This name will appear in agent configuration.
                  </div>
                </div>
              </div>
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center bg-gray-50/50">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
                <p className="text-sm font-medium mb-1">Drag & drop files here or</p>
                <button type="button" className="text-[#7C3AED] font-bold text-sm hover:underline">Select Files</button>
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                  PDF, DOCS, TXT, MD up to 10MB. HTML files are not supported.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg font-medium text-sm">Cancel</button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 py-2 bg-[#7C3AED] text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [callingDays, setCallingDays] = useState('Mon to Fri');
  const [timezone, setTimezone] = useState('Asia/Calcutta');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startTime, endTime, callingDays, timezone })
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl">
        <h3 className="text-2xl font-bold mb-6">Create Campaign</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calling Days</label>
            <input type="text" value={callingDays} onChange={(e) => setCallingDays(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg font-medium">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-2 bg-[#7C3AED] text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
