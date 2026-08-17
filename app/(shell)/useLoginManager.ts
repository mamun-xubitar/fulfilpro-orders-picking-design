"use client";
import { useEffect, useState } from "react";
import useRequest from "@/hooks/useRequest";

type RestrictedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  autoApproved: boolean;
};

type ListData = { today: string; users: RestrictedUser[] };

const SHOWN_DATE_KEY = "loginManagerShownDate";

export default function useLoginManager(isAdmin: boolean) {
  const { request: fetchList } = useRequest<ListData>();
  const { request: save, loading: saving } = useRequest();
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState("");
  const [users, setUsers] = useState<RestrictedUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function load() {
    fetchList({
      url: "/api/auth/login-auto-approvals",
      method: "GET",
      showToast: false,
      onSuccess: ({ data }) => {
        setToday(data.today);
        setUsers(data.users);
        setSelectedIds(data.users.filter((u) => u.autoApproved).map((u) => u.id));

        if (typeof window !== "undefined" && window.localStorage.getItem(SHOWN_DATE_KEY) !== data.today) {
          setOpen(true);
        }
      },
    });
  }

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function handleClose() {
    if (typeof window !== "undefined" && today) {
      window.localStorage.setItem(SHOWN_DATE_KEY, today);
    }
    setOpen(false);
  }

  function toggleUser(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.length === users.length ? [] : users.map((u) => u.id)));
  }

  function handleSave() {
    save({
      url: "/api/auth/login-auto-approvals",
      method: "PATCH",
      data: { userIds: selectedIds },
      successMessage: "Auto-approvals updated for today",
      onSuccess: () => handleClose(),
    });
  }

  return { open, setOpen, today, users, selectedIds, saving, toggleUser, toggleSelectAll, handleSave, handleClose };
}
