"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldAlert,
  UserPlus,
  Copy,
  Check,
  AlertCircle,
  Users,
  PowerOff,
  Power,
} from "lucide-react";
import type { Invitation, Profile, UserStatus } from "@/lib/supabase/types";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<Invitation | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [invitesRes, usersRes] = await Promise.all([
        fetch("/api/admin/invitations"),
        fetch("/api/admin/users"),
      ]);

      if (invitesRes.status === 403 || usersRes.status === 403) {
        setErrorMessage("Forbidden: You do not possess administrator rights.");
        setIsLoading(false);
        return;
      }

      const invitesData = await invitesRes.json();
      const usersData = await usersRes.json();

      if (invitesData.invitations) setInvitations(invitesData.invitations);
      if (usersData.users) setUsers(usersData.users);
    } catch {
      setErrorMessage("Failed to load admin management data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
          expires_in_days: expiresInDays,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message || data.error || "Failed to generate invite.");
        setIsGenerating(false);
        return;
      }

      setGeneratedInvite(data.invitation);
      setEmail("");
      setIsGenerating(false);
      fetchAdminData();
    } catch {
      setErrorMessage("Network error generating invitation.");
      setIsGenerating(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    const nextStatus: "active" | "disabled" = currentStatus === "active" ? "disabled" : "active";
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      if (response.ok) {
        fetchAdminData();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to update user status.");
      }
    } catch {
      alert("Network error updating status.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (errorMessage && errorMessage.includes("Forbidden")) {
    return (
      <Card className="text-center py-12 space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Access Denied
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          The admin section is strictly reserved for the application Owner and appointed Administrators.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Admin & Access Portal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Generate private invitations and govern member access permissions.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Invite Generation Card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <span>Issue New Invitation</span>
        </div>

        <form onSubmit={handleCreateInvite} className="space-y-3">
          <Input
            label="Recipient Email"
            type="email"
            required
            placeholder="member@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assign Role
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={role}
                onChange={(e) => setRole(e.target.value as "member" | "admin")}
              >
                <option value="member">Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Validity
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              >
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
          </div>

          <Button type="submit" isLoading={isGenerating} className="w-full">
            Generate Secure Invitation Code
          </Button>
        </form>

        {generatedInvite && (
          <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Invitation Generated!
              </span>
              <Badge variant="emerald">{generatedInvite.role.toUpperCase()}</Badge>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700">
              <code className="text-base font-black tracking-wider text-emerald-700 dark:text-emerald-300">
                {generatedInvite.invitation_code}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedInvite.invitation_code)}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Copy Code"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Send this code privately to <b>{generatedInvite.email}</b>. They will use it to activate their account at <code>/register</code>.
            </p>
          </div>
        )}
      </Card>

      {/* Invitations History */}
      <Card className="space-y-3">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Recent Invitations ({invitations.length})
        </h2>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-3 text-center">Loading invitations...</p>
        ) : invitations.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No invitations issued yet.</p>
        ) : (
          <div className="space-y-2">
            {invitations.map((inv) => {
              const isUsed = !!inv.used_at;
              const isExpired = new Date(inv.expires_at).getTime() < Date.now();

              return (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {inv.email}
                      </span>
                      <Badge variant={inv.role === "admin" ? "blue" : "slate"}>
                        {inv.role}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Code: <code className="text-slate-600 dark:text-slate-300 font-bold">{inv.invitation_code}</code>
                    </div>
                  </div>

                  <div>
                    {isUsed ? (
                      <Badge variant="emerald">Claimed</Badge>
                    ) : isExpired ? (
                      <Badge variant="rose">Expired</Badge>
                    ) : (
                      <Badge variant="amber">Pending</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Registered Users Management */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Members Directory ({users.length})</span>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-3 text-center">Loading members...</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No members found.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {u.full_name || u.email}
                    </span>
                    <Badge variant={u.role === "owner" ? "amber" : u.role === "admin" ? "blue" : "emerald"}>
                      {u.role}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {u.email}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={u.status === "active" ? "emerald" : "rose"}>
                    {u.status}
                  </Badge>

                  {u.role !== "owner" && (
                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(u.id, u.status)}
                      title={u.status === "active" ? "Deactivate User" : "Activate User"}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      {u.status === "active" ? (
                        <PowerOff className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <Power className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
