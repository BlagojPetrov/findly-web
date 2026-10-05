"use client";

import {
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCategory, reorderCategories } from "@/actions/categories";
import { CategoryForm } from "@/components/admin/category-form";
import { CategoryIcon } from "@/components/items/category-icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AdminCategory } from "@/lib/queries/admin";

// The "other" category is required by the matching rules (P10.S6).
const PROTECTED_SLUG = "other";

// Moves the category at `index` one place up (-1) or down (+1).
export function moved(ids: number[], index: number, step: -1 | 1) {
  const next = [...ids];
  const target = index + step;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// Admin list of categories in display order: add, edit (names and icon),
// move up/down (saved as the full order at once, shown optimistically) and
// delete (only unused categories other than "other"; the database refuses
// the rest as well). The actions refresh the page.
export function CategoryManager({
  categories,
  locale,
}: {
  categories: AdminCategory[];
  locale: string;
}) {
  const t = useTranslations("Admin.categories");
  const tErrors = useTranslations("Errors");
  const [createOpen, setCreateOpen] = useState(false);
  const [moving, startMove] = useTransition();
  const [order, setOptimisticOrder] = useOptimistic(
    categories.map((category) => category.id),
  );
  const byId = new Map(categories.map((category) => [category.id, category]));
  const list = order
    .map((id) => byId.get(id))
    .filter((category): category is AdminCategory => category !== undefined);

  function move(index: number, step: -1 | 1) {
    const next = moved(order, index, step);
    const data = new FormData();
    for (const id of next) data.append("ids", String(id));
    startMove(async () => {
      setOptimisticOrder(next);
      const result = await reorderCategories(data);
      if (!result.ok) toast.error(tErrors(result.error));
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="categories-count" className="text-sm text-muted-foreground">
          {t("count", { count: categories.length })}
        </h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button type="button" />}>
            <Plus aria-hidden />
            {t("add")}
          </DialogTrigger>
          <DialogContent showCloseButton={false} className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("addTitle")}</DialogTitle>
              <DialogDescription>{t("addDescription")}</DialogDescription>
            </DialogHeader>
            <CategoryForm onSaved={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <ol aria-labelledby="categories-count" className="grid gap-2">
        {list.map((category, index) => (
          <CategoryRow
            key={category.id}
            category={category}
            name={locale === "mk" ? category.nameMk : category.nameEn}
            first={index === 0}
            last={index === list.length - 1}
            moving={moving}
            onMove={(step) => move(index, step)}
          />
        ))}
      </ol>
    </div>
  );
}

function CategoryRow({
  category,
  name,
  first,
  last,
  moving,
  onMove,
}: {
  category: AdminCategory;
  name: string;
  first: boolean;
  last: boolean;
  moving: boolean;
  onMove: (step: -1 | 1) => void;
}) {
  const t = useTranslations("Admin.categories");
  const tErrors = useTranslations("Errors");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const inUse = category.itemCount > 0;
  const protectedCategory = category.slug === PROTECTED_SLUG;

  function confirmDelete() {
    const data = new FormData();
    data.set("id", String(category.id));
    startDelete(async () => {
      const result = await deleteCategory(data);
      setConfirmOpen(false);
      if (!result.ok) {
        toast.error(tErrors(result.error));
        return;
      }
      toast.success(t("deletedToast", { name }));
    });
  }

  return (
    <li
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card p-3 [overflow-wrap:anywhere] shadow-xs"
      data-slug={category.slug}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <CategoryIcon name={category.icon} className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 basis-48 gap-0.5 text-sm">
        <p className="font-medium">
          {category.nameMk} <span className="text-muted-foreground">/</span>{" "}
          {category.nameEn}
        </p>
        <p className="text-xs text-muted-foreground">
          <code>{category.slug}</code> ·{" "}
          {t("items", { count: category.itemCount })}
          {protectedCategory && ` · ${t("protected")}`}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={first || moving}
          aria-label={t("moveUp", { name })}
          title={t("moveUp", { name })}
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={last || moving}
          aria-label={t("moveDown", { name })}
          title={t("moveDown", { name })}
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden />
        </Button>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("edit", { name })}
                title={t("edit", { name })}
              />
            }
          >
            <Pencil aria-hidden />
          </DialogTrigger>
          <DialogContent showCloseButton={false} className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("editTitle", { name })}</DialogTitle>
              <DialogDescription>{t("editDescription")}</DialogDescription>
            </DialogHeader>
            <CategoryForm
              category={category}
              onSaved={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={inUse || protectedCategory || deleting}
                aria-label={t("delete", { name })}
                title={
                  protectedCategory
                    ? t("protected")
                    : inUse
                      ? t("inUse")
                      : t("delete", { name })
                }
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              />
            }
          >
            <Trash2 aria-hidden />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle", { name })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting && (
                  <LoaderCircle className="animate-spin" aria-hidden />
                )}
                {t("confirmDelete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
