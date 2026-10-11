import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Trash2, Radio, User, Terminal } from 'lucide-react';
import axios from 'axios';

type Account = { username: string; name: string; email: string; phone: string; activity_status: string; first_login: string | null };

export const AdminDashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/auth/admin/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then((response) => setAccounts(response.data)).catch((err) => {
      setError(err.response?.data?.detail || 'Unable to load accounts.');
    });
  }, []);

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch {}
    localStorage.removeItem('token');
    navigate('/login');
  };
  const deleteAccount = async (account: Account) => {
    if (!window.confirm(`Delete the account for ${account.name}?`)) return;
    try {
      await axios.delete(`/api/auth/admin/users/${encodeURIComponent(account.username)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAccounts((current) => current.filter((item) => item.username !== account.username));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to delete account.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] command-grid text-slate-200 p-6 sm:p-10 font-sans relative">
      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        <header className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shadow-glow-cyan/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">ADMIN ACCOUNT SECURITY CONSOLE</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Manage provisioned analyst credentials and system security access</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700/80 hover:border-rose-700/60 rounded-xl text-xs font-mono font-semibold transition-all active:scale-95 self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>LOGOUT</span>
          </button>
        </header>

        {error && (
          <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200 font-bold ml-4">✕</button>
          </div>
        )}

        <div className="overflow-x-auto bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
            <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">Provisioned User Registry</span>
            <span className="text-[10px] font-mono text-slate-500">{accounts.length} Active Identity Records</span>
          </div>

          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                {['Analyst Name', 'Email Identifier', 'Contact Phone', 'Activity Status', 'First Observed Login', 'Revoke Access'].map((heading) => (
                  <th key={heading} className="p-4">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    No analyst accounts found in the security database.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  return (
                    <tr key={`${account.email}-${account.phone}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-slate-100 font-sans flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span>{account.name}</span>
                      </td>
                      <td className="p-4 text-cyan-300">{account.email}</td>
                      <td className="p-4 text-slate-400 text-[11px]">{account.phone}</td>
                      <td className="p-4">
                        {account.activity_status === 'Active' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ACTIVE
                          </span>
                        ) : account.activity_status === 'Disabled' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border bg-rose-500/15 text-rose-400 border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            DISABLED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border bg-slate-800/80 text-slate-400 border-slate-700/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-[11px] text-slate-400">
                        {account.first_login ? new Date(`${account.first_login}Z`).toLocaleString() : 'Never Authenticated'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => deleteAccount(account)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 border border-rose-800/50 hover:border-rose-700 rounded-lg text-xs font-semibold transition-all active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> DELETE
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
