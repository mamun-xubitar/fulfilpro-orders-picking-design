'use client';

import { useState, useCallback, useEffect } from 'react';
import useRequest from '@/hooks/useRequest';
import type { SavedFile, TaskForm, TaskRow, UserOption } from '../types';
import { EMPTY_TASK_FORM } from '../types';

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type MutationsParams = {
  bumpRefresh: () => void;
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
};

export function useTaskMutations({ bumpRefresh, setTasks }: MutationsParams) {
  const { request, loading, errors, setErrors } = useRequest<TaskRow>();

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_TASK_FORM);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Complete modal
  const [completeModalTask, setCompleteModalTask] = useState<TaskRow | null>(null);
  const [proofFiles, setProofFiles] = useState<SavedFile[]>([]);

  // Proof view modal
  const [proofViewTask, setProofViewTask] = useState<TaskRow | null>(null);

  // View detail modal
  const [viewTask, setViewTask] = useState<TaskRow | null>(null);

  function loadUsers() {
    fetch('/api/users')
      .then((r) => r.json() as Promise<{ success: boolean; data: UserOption[] }>)
      .then((r) => { if (r.success) setUsers(r.data); })
      .catch(() => {});
  }

  useEffect(() => { loadUsers(); }, []);

  const openAdd = useCallback(() => {
    setEditTask(null);
    setForm(EMPTY_TASK_FORM);
    setErrors({});
    loadUsers();
    setModalOpen(true);
  }, [setErrors]);

  const openEdit = useCallback((task: TaskRow) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description,
      dueType: task.dueType,
      dueDate: toDatetimeLocal(task.dueDate),
      assigneeId: task.assigneeId,
    });
    setErrors({});
    loadUsers();
    setModalOpen(true);
  }, [setErrors]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTask(null);
  }, []);

  const set = (field: keyof TaskForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  function submitForm() {
    const url = editTask ? `/api/tasks/${editTask.id}` : '/api/tasks';
    const method = editTask ? 'PATCH' : 'POST';
    void request({
      url,
      method,
      data: form as unknown as Record<string, unknown>,
      showToast: true,
      successMessage: editTask ? 'Task updated' : 'Task created',
      validation: async () => {
        const errs: Record<string, string> = {};
        if (!form.title.trim()) errs.title = 'Title is required';
        if (!form.description.trim()) errs.description = 'Description is required';
        if (!form.dueType) errs.dueType = 'Due type is required';
        if (form.dueType === 'CUSTOM' && !form.dueDate) errs.dueDate = 'Due date is required';
        if (!form.assigneeId) errs.assigneeId = 'Assignee is required';
        return errs;
      },
      onSuccess: () => {
        bumpRefresh();
        closeModal();
      },
    });
  }

  function deleteTask(taskId: string) {
    void request({
      url: `/api/tasks/${taskId}`,
      method: 'DELETE',
      showToast: true,
      successMessage: 'Task deleted',
      onSuccess: () => {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        bumpRefresh();
      },
    });
  }

  function openComplete(task: TaskRow) {
    setCompleteModalTask(task);
    setProofFiles([]);
  }

  function closeComplete() {
    setCompleteModalTask(null);
    setProofFiles([]);
  }

  function removeProofFile(index: number) {
    setProofFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const openProofs = useCallback((task: TaskRow) => setProofViewTask(task), []);
  const closeProofs = useCallback(() => setProofViewTask(null), []);

  const openView = useCallback((task: TaskRow) => setViewTask(task), []);
  const closeView = useCallback(() => setViewTask(null), []);

  async function uploadProof(files: FileList) {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append('files', f));
    const res = await fetch('/api/tasks/uploads', { method: 'POST', body: formData });
    const json = await res.json() as { success: boolean; data: { files: SavedFile[] } };
    if (json.success) setProofFiles((prev) => [...prev, ...json.data.files]);
  }

  function submitComplete() {
    if (!completeModalTask) return;
    void request({
      url: `/api/tasks/${completeModalTask.id}/complete`,
      method: 'POST',
      data: { proofFiles: proofFiles as unknown as Record<string, unknown>[] } as unknown as Record<string, unknown>,
      showToast: true,
      successMessage: 'Task marked complete',
      onSuccess: () => {
        bumpRefresh();
        closeComplete();
      },
    });
  }

  return {
    loading,
    errors,
    // Add/edit modal
    modalOpen,
    editTask,
    form,
    set,
    users,
    openAdd,
    openEdit,
    closeModal,
    submitForm,
    // Delete
    deleteTask,
    // Complete modal
    completeModalTask,
    proofFiles,
    openComplete,
    closeComplete,
    uploadProof,
    submitComplete,
    removeProofFile,
    // Proof view modal
    proofViewTask,
    openProofs,
    closeProofs,
    // View detail modal
    viewTask,
    openView,
    closeView,
  };
}
