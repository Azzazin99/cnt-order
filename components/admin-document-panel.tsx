"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  AdminDocumentForm,
  type DocumentFormState,
} from "@/components/admin-document-form";
import { AdminDocumentList } from "@/components/admin-document-list";
import {
  buildSchoolNameMap,
  organizationKeyFromSchoolId,
} from "@/lib/document-organization";
import type { DocumentItem } from "@/lib/documents";
import { formatSchoolDisplayName } from "@/lib/school-display";
import { isPdfFileMeta, PDF_UPLOAD_ERROR } from "@/lib/pdf-upload";
import type { UserRole } from "@/lib/users";

const initialForm: DocumentFormState = {
  orderNo: "",
  title: "",
  organization: "",
  category: "",
  orderDate: "",
};

type ViewMode = "list" | "create" | "edit";

type LockedSchool = {
  id: string;
  name: string;
};

export function AdminDocumentPanel({
  initialItems,
  currentRole,
  isPlatformAdmin,
  schools,
  lockedSchool,
}: {
  initialItems: DocumentItem[];
  currentRole: UserRole | "unknown";
  isPlatformAdmin: boolean;
  schools: { id: string; name: string }[];
  lockedSchool: LockedSchool | null;
}) {
  const [items, setItems] = useState<DocumentItem[]>(initialItems);
  const [view, setView] = useState<ViewMode>("list");
  const [form, setForm] = useState<DocumentFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [listMessage, setListMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const canWrite = currentRole === "admin" || currentRole === "editor";
  const canDelete = currentRole === "admin";

  const schoolNameMap = useMemo(() => {
    const map = buildSchoolNameMap(schools);
    if (lockedSchool) {
      map.set(lockedSchool.id, lockedSchool.name);
    }
    return map;
  }, [schools, lockedSchool]);

  const lockedSchoolLabel = lockedSchool
    ? formatSchoolDisplayName(lockedSchool.name)
    : "";

  function goToList(successText?: string) {
    setView("list");
    setEditingId(null);
    setForm(initialForm);
    setFile(null);
    setFormMessage(null);
    if (successText) {
      setListMessage({ type: "success", text: successText });
    }
  }

  function startCreate() {
    setView("create");
    setEditingId(null);
    setForm(initialForm);
    setFile(null);
    setFormMessage(null);
    setListMessage(null);
  }

  function startEdit(item: DocumentItem) {
    setView("edit");
    setEditingId(item.id);
    setForm({
      orderNo: item.orderNo,
      title: item.title,
      organization: organizationKeyFromSchoolId(item.schoolId),
      category: item.category,
      orderDate: item.orderDate,
    });
    setFile(null);
    setFormMessage(null);
    setListMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      setFormMessage({
        type: "error",
        text: "บัญชีของคุณไม่มีสิทธิ์เพิ่ม/แก้ไขเอกสาร",
      });
      return;
    }
    setFormMessage(null);

    if (file && !isPdfFileMeta(file)) {
      setFormMessage({ type: "error", text: PDF_UPLOAD_ERROR });
      return;
    }

    setLoading(true);

    const payload = new FormData();
    payload.append("orderNo", form.orderNo);
    payload.append("title", form.title);
    if (isPlatformAdmin) {
      payload.append("organization", form.organization);
    }
    payload.append("category", form.category);
    payload.append("orderDate", form.orderDate);
    if (file) {
      payload.append("file", file);
    }

    const endpoint = editingId
      ? `/api/documents/${editingId}`
      : "/api/documents";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      body: payload,
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setFormMessage({
        type: "error",
        text:
          data?.error ??
          `${editingId ? "แก้ไข" : "เพิ่ม"}เอกสารไม่สำเร็จ กรุณาตรวจสอบข้อมูล`,
      });
      return;
    }

    const saved = (await res.json()) as DocumentItem;
    if (editingId) {
      setItems((prev) =>
        prev.map((item) => (item.id === saved.id ? saved : item)),
      );
      goToList("บันทึกการแก้ไขเอกสารเรียบร้อย");
    } else {
      setItems((prev) => [saved, ...prev]);
      goToList("เพิ่มเอกสารใหม่เรียบร้อย");
    }
  }

  async function handleDelete(id: string) {
    if (!canDelete) {
      setListMessage({
        type: "error",
        text: "บัญชีของคุณไม่มีสิทธิ์ลบเอกสาร",
      });
      return;
    }
    const confirmed = window.confirm("ยืนยันการลบเอกสารนี้?");
    if (!confirmed) {
      return;
    }
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setListMessage({ type: "error", text: "ลบเอกสารไม่สำเร็จ" });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setListMessage({ type: "success", text: "ลบเอกสารเรียบร้อย" });
  }

  if (view === "create" || view === "edit") {
    return (
      <AdminDocumentForm
        mode={view}
        form={form}
        setForm={setForm}
        file={file}
        setFile={setFile}
        loading={loading}
        canWrite={canWrite}
        isPlatformAdmin={isPlatformAdmin}
        schools={schools}
        lockedSchoolLabel={lockedSchoolLabel}
        message={formMessage}
        setMessage={setFormMessage}
        onSubmit={handleSubmit}
        onBack={() => goToList()}
      />
    );
  }

  return (
    <AdminDocumentList
      items={items}
      schoolNameMap={schoolNameMap}
      showOrganization={isPlatformAdmin}
      canWrite={canWrite}
      canDelete={canDelete}
      listMessage={listMessage}
      onAdd={startCreate}
      onEdit={startEdit}
      onDelete={handleDelete}
    />
  );
}
