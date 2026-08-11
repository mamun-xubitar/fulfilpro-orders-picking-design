'use client';

import { Suspense } from 'react';
import { useTasksPage } from './hooks/useTasksPage';
import TasksToolbar from './TasksToolbar';
import TasksTable from './TasksTable';
import AddEditTaskModal from './AddEditTaskModal';
import CompleteTaskModal from './CompleteTaskModal';
import ProofFilesModal from './ProofFilesModal';
import TaskDetailsModal from './TaskDetailsModal';
import TaskMessagesModal from './TaskMessagesModal';
import TaskReportTab from './TaskReportTab';
import ChatModal from '@/components/ChatModal';
import { DEFAULT_PAGE_SIZE } from './constants';

function TasksPageInner() {
  const p = useTasksPage();
  const userId = p.session?.user?.id ?? '';

  return (
    <main className="flex-1 p-4 md:p-6 space-y-4">
      <TasksToolbar
        tab={p.tab}
        setTab={p.setTab}
        search={p.search}
        setSearch={p.setSearch}
        filterAssigneeId={p.filterAssigneeId}
        setFilterAssigneeId={p.setFilterAssigneeId}
        filterDueType={p.filterDueType}
        setFilterDueType={p.setFilterDueType}
        tabCounts={p.tabCounts}
        users={p.users}
        onAdd={p.openAdd}
        onChat={p.chat.openPicker}
      />

      {p.tab === 'completed' ? (
        <TaskReportTab report={p.report} loading={p.reportLoading} isAdmin={p.userIsAdmin} />
      ) : null}

      {p.tab === 'recurring' ? (
        <TasksTable
          tasks={p.recurringParents}
          loading={p.recurringLoading}
          total={p.recurringTotal}
          page={p.page}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={p.setPage}
          currentUserId={userId}
          isAdmin={p.userIsAdmin}
          onEdit={p.openEdit}
          onDelete={p.deleteTask}
          onComplete={p.openComplete}
          onMessages={p.openMessages}
          onViewProofs={p.openProofs}
          onView={p.openView}
          expandable
          expandedIds={p.expandedIds}
          childrenByParent={p.childrenByParent}
          childrenLoading={p.childrenLoading}
          onToggleExpand={(task) => p.toggleExpand(task.id)}
          onStopRecurring={p.stopRecurring}
        />
      ) : (
        <TasksTable
          tasks={p.tasks}
          loading={p.dataLoading}
          total={p.total}
          page={p.page}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={p.setPage}
          currentUserId={userId}
          isAdmin={p.userIsAdmin}
          onEdit={p.openEdit}
          onDelete={p.deleteTask}
          onComplete={p.openComplete}
          onMessages={p.openMessages}
          onViewProofs={p.openProofs}
          onView={p.openView}
        />
      )}

      <AddEditTaskModal
        open={p.modalOpen}
        editTask={p.editTask}
        form={p.form}
        set={p.set}
        toggleAssignee={p.toggleAssignee}
        setSingleAssignee={p.setSingleAssignee}
        setDescriptionFor={p.setDescriptionFor}
        togglePerAssigneeDescription={p.togglePerAssigneeDescription}
        errors={p.errors}
        loading={p.loading}
        users={p.users}
        onSubmit={p.submitForm}
        onClose={p.closeModal}
      />

      <CompleteTaskModal
        task={p.completeModalTask}
        proofFiles={p.proofFiles}
        loading={p.loading}
        onUpload={p.uploadProof}
        onSubmit={p.submitComplete}
        onClose={p.closeComplete}
        onRemoveFile={p.removeProofFile}
      />

      <ProofFilesModal task={p.proofViewTask} onClose={p.closeProofs} />
      <TaskDetailsModal task={p.viewTask} onClose={p.closeView} />

      <TaskMessagesModal
        task={p.messagesTask}
        messages={p.messages}
        messagesLoading={p.messagesLoading}
        messageText={p.messageText}
        setMessageText={p.setMessageText}
        messageSending={p.messageSending}
        currentUserId={userId}
        onSend={p.sendMessage}
        onClose={p.closeMessages}
      />

      <ChatModal
        {...p.chat}
        currentUserId={userId}
        onSelectUser={p.chat.selectUser}
        onSend={p.chat.sendMessage}
        onClose={p.chat.close}
      />
    </main>
  );
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksPageInner />
    </Suspense>
  );
}
