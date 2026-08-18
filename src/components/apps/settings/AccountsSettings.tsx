import React, { useState, useEffect } from 'react';
import { useOS } from '../../../context/OSContext';
import {
  User,
  Key,
  Mail,
  Users,
  Cloud,
  UserPlus,
  Briefcase,
  ChevronRight,
  Shield,
  X,
  Check,
  Edit2,
  Lock,
  Smartphone,
  HardDrive,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

export const AccountsSettings: React.FC = () => {
  const { 
    addNotification,
    currentUser,
    userAccounts,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    refreshUserAccounts
  } = useOS();

  // User details state with authoritative context fallback
  const [userName, setUserName] = useState<string>(currentUser?.fullName || currentUser?.username || 'Windroid Administrator');
  const [userEmail, setUserEmail] = useState<string>(currentUser?.email || `${currentUser?.username || 'admin'}@windroid.local`);
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');

  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.fullName || currentUser.username || 'Windroid Administrator');
      setUserEmail(currentUser.email || `${currentUser.username}@windroid.local`);
      if (currentUser.avatarUrl) {
        setAvatarUrl(currentUser.avatarUrl);
      }
    }
  }, [currentUser]);

  // Modal States
  const [activeModal, setActiveModal] = useState<
    | null
    | 'yourInfo'
    | 'signInOptions'
    | 'emailAccounts'
    | 'family'
    | 'backup'
    | 'otherUsers'
    | 'workSchool'
  >(null);

  // Sign-In Options state
  const [pin, setPin] = useState<string>('1234');
  const [faceUnlock, setFaceUnlock] = useState<boolean>(true);
  const [fingerprint, setFingerprint] = useState<boolean>(true);

  // Linked Accounts
  const [linkedAccounts, setLinkedAccounts] = useState<
    { id: string; email: string; provider: string }[]
  >([
    { id: 'acc_1', email: 'work@windroid.org', provider: 'Windroid Work' },
    { id: 'acc_2', email: 'user.personal@gmail.com', provider: 'Google Account' }
  ]);

  // Family members
  const [familyMembers, setFamilyMembers] = useState<
    { id: string; name: string; role: string }[]
  >([
    { id: 'fam_1', name: 'Sarah Sahil', role: 'Organizer' },
    { id: 'fam_2', name: 'Leo Sahil', role: 'Member (Child)' }
  ]);

  // Work/School account
  const [workConnected, setWorkConnected] = useState<boolean>(true);

  const handleSaveInfo = async () => {
    if (currentUser) {
      await updateUserAccount({
        username: currentUser.username,
        fullName: userName,
        isAdmin: currentUser.isAdmin
      });
      await refreshUserAccounts();
    }
    setActiveModal(null);
    addNotification({
      title: 'Account Info Saved',
      message: 'Your profile details have been updated.',
      type: 'info'
    });
  };

  return (
    <div className="space-y-6 text-xs font-sans select-none max-w-5xl mx-auto pb-8">
      {/* 1. HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#202124] dark:text-slate-100 tracking-tight">
          Accounts
        </h1>
        <p className="text-[13px] text-[#5F6368] dark:text-slate-400 mt-0.5">
          Manage your accounts and account settings across Windroid OS.
        </p>
      </div>

      {/* 2. PROFILE HEADER & ACCOUNT STATUS CARDS (Figma Exact Replica) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Profile Card Left */}
        <div className="lg:col-span-5 bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex items-center gap-4">
          <img
            src={avatarUrl}
            alt="User Avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800 shadow-xs shrink-0"
          />

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#202124] dark:text-slate-100 truncate">
              {userName}
            </h2>
            <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
              {userEmail}
            </div>
            <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-1 font-medium">
              Administrator
            </div>
          </div>
        </div>

        {/* Status Cards Right (Account, Security, OneDrive/Aether Cloud) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Account */}
          <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between h-28">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#0067C0]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#202124] dark:text-slate-100">
                  Account
                </div>
                <div className="text-[11px] text-[#5F6368] dark:text-slate-400">
                  Local Account
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setActiveModal('yourInfo')}
                className="text-xs font-semibold text-[#0067C0] hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Card 2: Security */}
          <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between h-28">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#202124] dark:text-slate-100">
                  Security
                </div>
                <div className="text-[11px] text-[#5F6368] dark:text-slate-400">
                  Windows Hello
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setActiveModal('signInOptions')}
                className="text-xs font-semibold text-[#0067C0] hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Card 3: Cloud / OneDrive */}
          <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between h-28">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#0067C0]">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#202124] dark:text-slate-100">
                  OneDrive
                </div>
                <div className="text-[11px] text-[#5F6368] dark:text-slate-400">
                  Synced
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setActiveModal('backup')}
                className="text-xs font-semibold text-[#0067C0] hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ACCOUNTS SETTINGS LIST (Figma Replica) */}
      <div className="bg-white dark:bg-[#202024] border border-[#E5E7EB] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* ROW 1: Your info */}
        <div
          onClick={() => setActiveModal('yourInfo')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <User className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Your info
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Profile photo, name, and account details
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 2: Sign-in options */}
        <div
          onClick={() => setActiveModal('signInOptions')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Key className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Sign-in options
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Windows Hello, password, PIN, security key
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 3: Email & accounts */}
        <div
          onClick={() => setActiveModal('emailAccounts')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Mail className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Email & accounts
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Accounts used by email, calendar, and contacts
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 4: Family */}
        <div
          onClick={() => setActiveModal('family')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Users className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Family
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Manage your family group, edit account types and device permissions
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 5: Windows backup */}
        <div
          onClick={() => setActiveModal('backup')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Cloud className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Windows backup
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Back up your files, apps, preferences to restore them across devices
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 6: Other users */}
        <div
          onClick={() => setActiveModal('otherUsers')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <UserPlus className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Other users
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Device access, work or school users, assigned access
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>

        {/* ROW 7: Access work or school */}
        <div
          onClick={() => setActiveModal('workSchool')}
          className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
            <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#202124] dark:text-slate-200">
              <Briefcase className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#0067C0] transition-colors">
                Access work or school
              </div>
              <div className="text-xs text-[#5F6368] dark:text-slate-400 mt-0.5 truncate">
                Organization resources like email, apps, and network
              </div>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-[#5F6368] dark:text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </div>
      </div>

      {/* 4. MODALS FOR FUNCTIONALITY */}

      {/* MODAL 1: YOUR INFO */}
      {activeModal === 'yourInfo' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Your Info & Account Profile
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                />
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const newUrl = prompt(
                        'Enter new Avatar Image URL:',
                        avatarUrl
                      );
                      if (newUrl) setAvatarUrl(newUrl);
                    }}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[#202124] dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Change Picture
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5F6368] block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0067C0]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#5F6368] block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0067C0]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveInfo}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SIGN-IN OPTIONS */}
      {activeModal === 'signInOptions' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Sign-in options (Windows Hello)
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5">
                <div>
                  <div className="font-semibold text-xs text-[#202124] dark:text-slate-100">
                    PIN (Windows Hello)
                  </div>
                  <div className="text-[11px] text-[#5F6368]">Current PIN: ****</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newPin = prompt('Enter new 4-digit PIN:', pin);
                    if (newPin) setPin(newPin);
                  }}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Change PIN
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5">
                <div>
                  <div className="font-semibold text-xs text-[#202124] dark:text-slate-100">
                    Facial Recognition (Windows Hello)
                  </div>
                  <div className="text-[11px] text-[#5F6368]">Use camera to sign in</div>
                </div>
                <input
                  type="checkbox"
                  checked={faceUnlock}
                  onChange={(e) => setFaceUnlock(e.target.checked)}
                  className="w-4 h-4 accent-[#0067C0] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5">
                <div>
                  <div className="font-semibold text-xs text-[#202124] dark:text-slate-100">
                    Fingerprint Recognition
                  </div>
                  <div className="text-[11px] text-[#5F6368]">Touch sensor unlock</div>
                </div>
                <input
                  type="checkbox"
                  checked={fingerprint}
                  onChange={(e) => setFingerprint(e.target.checked)}
                  className="w-4 h-4 accent-[#0067C0] cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EMAIL & ACCOUNTS */}
      {activeModal === 'emailAccounts' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Email & Linked Accounts
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {linkedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#202124] dark:text-slate-100">
                      {acc.provider}
                    </div>
                    <div className="text-[11px] text-[#5F6368]">{acc.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setLinkedAccounts((prev) => prev.filter((a) => a.id !== acc.id))
                    }
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const mail = prompt('Enter secondary account email:');
                if (mail) {
                  setLinkedAccounts((prev) => [
                    ...prev,
                    { id: Date.now().toString(), email: mail, provider: 'Work / Personal Account' }
                  ]);
                }
              }}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[#202124] dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Account
            </button>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FAMILY */}
      {activeModal === 'family' && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100">
                Family Group Management
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {familyMembers.map((fam) => (
                <div
                  key={fam.id}
                  className="p-3 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-[#202124] dark:text-slate-100">
                      {fam.name}
                    </div>
                    <div className="text-[11px] text-[#5F6368]">{fam.role}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: BACKUP / OTHER / WORK */}
      {(activeModal === 'backup' || activeModal === 'otherUsers' || activeModal === 'workSchool') && (
        <div className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#202024]/95 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-sm text-[#202124] dark:text-slate-100 capitalize">
                {activeModal === 'backup'
                  ? 'Windows / Cloud Backup'
                  : activeModal === 'otherUsers'
                  ? 'Other Users on Device'
                  : 'Access Work or School'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#5F6368] dark:text-slate-300 leading-relaxed">
              {activeModal === 'backup' &&
                'Your preferences, desktop wallpaper, app settings, and cloud files are automatically backed up and synced across all your Windroid OS devices.'}
              {activeModal === 'otherUsers' && (
                <div className="space-y-2">
                  <p className="mb-2">Configured Linux system user accounts on this device:</p>
                  {userAccounts.map((acc) => (
                    <div key={acc.username} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{acc.fullName || acc.username}</div>
                        <div className="text-[11px] text-slate-500">@{acc.username} • {acc.isAdmin ? 'Administrator' : 'Standard User'}</div>
                      </div>
                      {acc.isCurrentSession && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded font-medium">Active</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activeModal === 'workSchool' &&
                'Connected to Organization resources (Windroid Enterprise domain). Device health and security policy compliance active.'}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#0067C0] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
