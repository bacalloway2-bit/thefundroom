"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthContext } from "../../lib/auth/session";
import {
  addNote,
  addTask,
  createDeal,
  moveStage,
  toggleTask,
  PRODUCT_TYPES,
} from "../../lib/data/deals";
import * as v from "../../lib/validation";

function backWithError(target: string, errors: v.FieldErrors): never {
  const message = Object.values(errors).join(" ");
  redirect(`${target}${target.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function openDealAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();
  const errors: v.FieldErrors = {};

  const clientId = v.uuid(form.get("clientId"));
  if (!clientId) errors.clientId = "Choose the business this deal is for.";

  const name = v.requiredText(form, "name", "Deal name", errors);
  const requestedAmount = v.money(form, "requestedAmount", "Amount requested", errors);
  const productType = v.choice(form, "productType", "Product", PRODUCT_TYPES, errors);

  if (Object.keys(errors).length > 0) backWithError("/deals?new=1", errors);

  const dealId = await createDeal(ctx, {
    clientId: clientId!,
    name,
    productType,
    requestedAmount,
    useOfProceeds: v.text(form, "useOfProceeds"),
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect(`/deals?id=${dealId}`);
}

export async function moveStageAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();

  const dealId = v.uuid(form.get("dealId"));
  const toStageId = v.uuid(form.get("toStageId"));
  if (!dealId || !toStageId) {
    backWithError("/deals", { stage: "That stage could not be identified." });
  }

  await moveStage(ctx, dealId!, toStageId!, v.text(form, "note"));

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect(`/deals?id=${dealId}`);
}

export async function addNoteAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();

  const dealId = v.uuid(form.get("dealId"));
  const errors: v.FieldErrors = {};
  const body = v.requiredText(form, "body", "Note", errors, 5000);

  if (!dealId) backWithError("/deals", { deal: "That deal could not be identified." });
  if (Object.keys(errors).length > 0) backWithError(`/deals?id=${dealId}`, errors);

  await addNote(ctx, dealId!, body);

  revalidatePath("/deals");
  redirect(`/deals?id=${dealId}`);
}

export async function addTaskAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();

  const dealId = v.uuid(form.get("dealId"));
  const errors: v.FieldErrors = {};
  const title = v.requiredText(form, "title", "Task", errors);
  const due = v.text(form, "dueAt");

  let dueAt: Date | undefined;
  if (due) {
    const parsed = new Date(due);
    if (Number.isNaN(parsed.getTime())) errors.dueAt = "That is not a valid date.";
    else dueAt = parsed;
  }

  if (!dealId) backWithError("/deals", { deal: "That deal could not be identified." });
  if (Object.keys(errors).length > 0) backWithError(`/deals?id=${dealId}`, errors);

  await addTask(ctx, dealId!, { title, dueAt });

  revalidatePath("/deals");
  redirect(`/deals?id=${dealId}`);
}

export async function toggleTaskAction(form: FormData): Promise<void> {
  const ctx = await requireAuthContext();

  const dealId = v.uuid(form.get("dealId"));
  const taskId = v.uuid(form.get("taskId"));
  if (!taskId || !dealId) {
    backWithError("/deals", { task: "That task could not be identified." });
  }

  await toggleTask(ctx, taskId!);

  revalidatePath("/deals");
  redirect(`/deals?id=${dealId}`);
}
