import { useEffect, useState } from 'react';
import { getPendingUsersApi, approveUserApi, rejectUserApi, promoteUserApi, getAllUsersApi } from '../api/admin';
import { getNotificationsApi, markNotificationReadApi } from '../api/notifications';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import Alert from '../components/Common/Alert';
import type { Notification } from '../utils/types';

interface PendingUser {
  id: number;
  email: string;
  created_at: string | null;
}

interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  profile_completed: boolean;
  created_at: string | null;
}

export default function Admin() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tab, setTab] = useState<'pending' | 'users' | 'notifications'>('pending');

  const fetchData = async () => {
    try {
      const [pendingRes, usersRes, notifRes] = await Promise.all([
        getPendingUsersApi(),
        getAllUsersApi(),
        getNotificationsApi(),
      ]);
      setPending(pendingRes.data.pending_users);
      setUsers(usersRes.data.users);
      setNotifications(notifRes.data.notifications);
    } catch {
      console.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await approveUserApi(id);
      setAlert({ type: 'success', message: 'User approved' });
      fetchData();
    } catch {
      setAlert({ type: 'error', message: 'Failed to approve user' });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectUserApi(id);
      setAlert({ type: 'success', message: 'User rejected and removed' });
      fetchData();
    } catch {
      setAlert({ type: 'error', message: 'Failed to reject user' });
    }
  };

  const handlePromote = async (id: number) => {
    try {
      await promoteUserApi(id);
      setAlert({ type: 'success', message: 'User promoted to admin' });
      fetchData();
    } catch {
      setAlert({ type: 'error', message: 'Failed to promote user' });
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationReadApi(id);
      fetchData();
    } catch {
      console.error('Failed to mark notification read');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin Panel</h1>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
        {(['pending', 'users', 'notifications'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm rounded-md transition-colors capitalize ${
              tab === t ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t} {t === 'pending' && pending.length > 0 && `(${pending.length})`}
          </button>
        ))}
      </div>

      {/* Pending users */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending users.</p>
          ) : (
            pending.map((u) => (
              <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-white text-sm">{u.email}</p>
                  <p className="text-xs text-gray-500">
                    Registered {u.created_at && new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(u.id)} className="text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-3 py-1.5 rounded transition-colors">
                    Approve
                  </button>
                  <button onClick={() => handleReject(u.id)} className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 px-3 py-1.5 rounded transition-colors">
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* All users */}
      {tab === 'users' && (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-white text-sm">{u.name || u.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{u.email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    u.role === 'admin' ? 'bg-amber-600/20 text-amber-400' :
                    u.role === 'pending' ? 'bg-gray-600/20 text-gray-400' :
                    'bg-emerald-600/20 text-emerald-400'
                  }`}>
                    {u.role}
                  </span>
                </div>
              </div>
              {u.role === 'user' && (
                <button onClick={() => handlePromote(u.id)} className="text-xs bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 px-3 py-1.5 rounded transition-colors">
                  Promote
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No notifications.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-gray-900 border rounded-xl p-4 flex justify-between items-center ${
                  n.is_read ? 'border-gray-800' : 'border-emerald-800'
                }`}
              >
                <div>
                  <p className="text-gray-300 text-sm">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {n.created_at && new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && (
                  <button onClick={() => handleMarkRead(n.id)} className="text-xs text-gray-400 hover:text-white px-2 py-1 transition-colors">
                    Mark read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
